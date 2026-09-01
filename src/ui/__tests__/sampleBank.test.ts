/**
 * The sample bank.
 *
 * No `.wav` has been supplied, so the path that matters most right now is the
 * missing-file one: it must be silent about it, cache the absence rather than
 * refetching on every part activation, and let the caller synthesise instead.
 *
 * The spec's hard requirement is that audio never breaks gameplay — files
 * failing to load, Web Audio missing, sound blocked before a gesture. Every
 * one of those is a test here.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  DEFERRED, NO_PITCH_VARIATION, PIXEL_SFX, PIXEL_VOLUME, PRELOAD, VOLUME_FOR,
} from '../pixel/sfxMap.js';
import { bankState, duckMovement, playSample, preload, resetBank } from '../pixel/sampleBank.js';
import type { SfxName } from '../pixel/sfxMap.js';

afterEach(() => { resetBank(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function fakeContext() {
  const played: Array<{ rate: number; gain: number }> = [];
  let pendingGain = 0;
  const ac = {
    currentTime: 0,
    sampleRate: 44100,
    destination: {},
    createBufferSource: () => {
      const src = {
        buffer: null as AudioBuffer | null,
        playbackRate: { value: 1 },
        onended: null as null | (() => void),
        connect: (n: unknown) => n,
        start: () => { played.push({ rate: src.playbackRate.value, gain: pendingGain }); },
      };
      return src;
    },
    createGain: () => ({ gain: { set value(v: number) { pendingGain = v; }, get value() { return pendingGain; } }, connect: (n: unknown) => n }),
    decodeAudioData: async () => ({ duration: 0.1 } as AudioBuffer),
  };
  return { ac: ac as unknown as AudioContext, played };
}

const stubFetch = (ok: boolean) => {
  vi.stubGlobal('fetch', vi.fn(async () => ({
    ok,
    arrayBuffer: async () => new ArrayBuffer(8),
  })));
};

describe('missing files', () => {
  it('reports a miss so the caller can synthesise', async () => {
    stubFetch(false);
    const { ac } = fakeContext();
    expect(playSample(ac, 'coil')).toBe(false);
    await vi.waitFor(() => expect(bankState('coil')).toBe('absent'));
  });

  it('does not refetch a known-absent cue on every activation', async () => {
    stubFetch(false);
    const { ac } = fakeContext();
    playSample(ac, 'coil');
    await vi.waitFor(() => expect(bankState('coil')).toBe('absent'));
    for (let i = 0; i < 25; i++) playSample(ac, 'coil');
    // One lookup, not twenty-six. A part firing in a cascade must not put a
    // request on the wire each time.
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it('survives fetch throwing outright', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('offline'); }));
    const { ac } = fakeContext();
    expect(() => playSample(ac, 'bell')).not.toThrow();
    await vi.waitFor(() => expect(bankState('bell')).toBe('absent'));
  });

  it('preloads without throwing when every file is missing', async () => {
    stubFetch(false);
    const { ac } = fakeContext();
    expect(() => preload(ac, PRELOAD)).not.toThrow();
    await vi.waitFor(() => expect(bankState('weight')).toBe('absent'));
  });
});

describe('playing a loaded sample', () => {
  async function loaded(name: SfxName) {
    stubFetch(true);
    const ctx = fakeContext();
    playSample(ctx.ac, name);
    await vi.waitFor(() => expect(bankState(name)).toBe('loaded'));
    return ctx;
  }

  it('plays once the buffer is cached', async () => {
    const { ac, played } = await loaded('coil');
    expect(playSample(ac, 'coil')).toBe(true);
    expect(played).toHaveLength(1);
  });

  it('varies pitch within the +/-4% the spec asks for', async () => {
    const { ac, played } = await loaded('marbleDrop');
    for (let i = 0; i < 20; i++) { playSample(ac, 'marbleDrop'); played.forEach(() => {}); }
    for (const p of played) {
      expect(p.rate).toBeGreaterThanOrEqual(0.96);
      expect(p.rate).toBeLessThanOrEqual(1.04);
    }
  });

  it('never varies the pitch of a cue that must stay recognisable', async () => {
    for (const name of NO_PITCH_VARIATION) {
      resetBank();
      const { ac, played } = await loaded(name);
      playSample(ac, name);
      for (const p of played) expect(p.rate, name).toBe(1);
    }
  });

  it('mixes at the level its band defines', async () => {
    const { ac, played } = await loaded('anvil');
    playSample(ac, 'anvil');
    expect(played.at(-1)!.gain).toBeCloseTo(PIXEL_VOLUME.anvil, 5);
  });

  it('caps how many copies of one cue sound at once', async () => {
    // A prism chain firing eight times in a frame should read as a chain, not
    // as one sound eight times as loud. onended is never called here, so the
    // voices stay live and the cap is what stops the fourth.
    const { ac, played } = await loaded('prism');
    for (let i = 0; i < 8; i++) playSample(ac, 'prism');
    expect(played.length).toBeLessThanOrEqual(3);
  });

  it('ducks the movement tick while a part is sounding', async () => {
    const { ac, played } = await loaded('marbleMove');
    playSample(ac, 'marbleMove');
    const open = played.at(-1)!.gain;
    duckMovement();
    playSample(ac, 'marbleMove');
    expect(played.at(-1)!.gain).toBeLessThan(open);
  });
});

describe('the sound map', () => {
  it('gives every cue a volume band', () => {
    for (const name of Object.keys(PIXEL_SFX) as SfxName[]) {
      expect(VOLUME_FOR[name], `${name} has no band`).toBeTruthy();
    }
  });

  it('loads every cue eventually, between preload and deferred', () => {
    const covered = new Set([...PRELOAD, ...DEFERRED]);
    const all = Object.keys(PIXEL_SFX) as SfxName[];
    expect(all.filter((n) => !covered.has(n))).toEqual([]);
  });

  it('preloads everything a drop can fire, and defers nothing that can', () => {
    // The spec's rule: no network delay when a part activates.
    const mustBeReady: SfxName[] = [
      'weight', 'anvil', 'coil', 'prism', 'spring', 'wire', 'reso', 'fork',
      'gatePass', 'gateFail', 'bell', 'marbleDrop', 'marbleMove', 'marbleLand',
    ];
    for (const name of mustBeReady) expect(PRELOAD, name).toContain(name);
    for (const name of mustBeReady) expect(DEFERRED, name).not.toContain(name);
  });

  it('points every path at the folder layout the spec defines', () => {
    for (const [name, path] of Object.entries(PIXEL_SFX)) {
      expect(path, name).toMatch(/^\/assets\/audio\/pixel\/(gameplay|parts|ui|events)\/[a-z-]+\.wav$/);
    }
  });
});
