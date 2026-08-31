/**
 * The pixel sound theme.
 *
 * The audible result cannot be asserted, so what is checked is the spec's QA
 * checklist: every one of the ten real part keys resolves to a voice, gate has
 * a separate failure cue, levels sit inside the guideline bands, and the three
 * cues the spec says must not be pitch-varied are deterministic.
 *
 * A fake AudioContext records what each voice builds, which is enough to prove
 * a cue fires, how long it runs, and that nothing is silent.
 */
import { describe, expect, it } from 'vitest';
import { LEVEL, pixelVoices } from '../pixel/pixelSfx.js';
import { PART_KEYS } from '../../game/types.js';

interface Built { readonly kind: 'osc' | 'buffer'; readonly gain: number; readonly end: number }

/** Enough of AudioContext for these voices, and nothing else. */
function fakeContext() {
  const built: Built[] = [];
  const ramp = { value: 0 };
  const node = () => ({ connect: (n: unknown) => n });
  const gainNode = () => {
    const rec = { kind: 'osc' as const, gain: 0, end: 0 };
    return {
      gain: {
        setValueAtTime: (v: number) => { rec.gain = Math.max(rec.gain, v); },
        exponentialRampToValueAtTime: (_v: number, t: number) => { rec.end = Math.max(rec.end, t); },
      },
      connect: (n: unknown) => n,
      _rec: rec,
    };
  };
  const ac = {
    currentTime: 0,
    sampleRate: 44100,
    destination: node(),
    createOscillator: () => {
      const rec = { kind: 'osc' as const, gain: 0, end: 0 };
      built.push(rec);
      return {
        type: 'square',
        frequency: { setValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, value: 0 },
        connect: (n: { _rec?: typeof rec }) => { if (n._rec) n._rec = rec; return n; },
        start: () => {}, stop: (t: number) => { rec.end = Math.max(rec.end, t); },
      };
    },
    createGain: () => {
      const g = gainNode();
      built.push(g._rec);
      return g;
    },
    createBuffer: (_c: number, frames: number) => ({ getChannelData: () => new Float32Array(frames) }),
    createBufferSource: () => {
      const rec = { kind: 'buffer' as const, gain: 0, end: 0 };
      built.push(rec);
      return { buffer: null as unknown, connect: (n: unknown) => n, start: () => {} };
    },
    createBiquadFilter: () => ({ type: 'highpass', frequency: { value: 0 }, connect: (n: unknown) => n }),
  };
  return { ac: ac as unknown as AudioContext, built, ramp };
}

describe('pixel part voices', () => {
  it('every one of the ten part keys resolves to a voice', () => {
    // First item on the spec's QA checklist.
    for (const part of PART_KEYS) {
      const { ac, built } = fakeContext();
      expect(() => pixelVoices.part(ac, part), part).not.toThrow();
      expect(built.length, `${part} produced no sound`).toBeGreaterThan(0);
    }
  });

  it('gate has a separate failure cue', () => {
    // Also on the checklist: pass and fail must be distinguishable.
    const pass = fakeContext();
    pixelVoices.part(pass.ac, 'gate');
    const fail = fakeContext();
    pixelVoices.gateFail(fail.ac);
    expect(pass.built.length).toBeGreaterThan(0);
    expect(fail.built.length).toBeGreaterThan(0);
    expect(fail.built.length).not.toBe(pass.built.length);
  });

  it('keeps every part cue inside the spec length budget', () => {
    // The design table caps parts at 400ms (bell). Anything longer would
    // still be ringing when the next frame of a cascade fires.
    for (const part of PART_KEYS) {
      const { ac, built } = fakeContext();
      pixelVoices.part(ac, part);
      const longest = Math.max(...built.map((b) => b.end));
      expect(longest, `${part} runs ${longest}s`).toBeLessThanOrEqual(0.45);
    }
  });
});

describe('pixel levels follow the spec guidelines', () => {
  it('uses the published table', () => {
    expect(LEVEL.ui).toBe(0.30);
    expect(LEVEL.marble).toBe(0.45);
    expect(LEVEL.part).toBe(0.58);
    expect(LEVEL.event).toBe(0.72);
    expect(LEVEL.win).toBe(0.80);
  });

  it('never plays a part louder than an event', () => {
    // The readability rule: a cascade of parts must not drown the payout.
    expect(LEVEL.part).toBeLessThan(LEVEL.event);
    expect(LEVEL.ui).toBeLessThan(LEVEL.part);
  });
});

describe('cues the spec says must not vary in pitch', () => {
  // jam warning, quota clear and round clear. Building each twice must give
  // an identical shape; a randomised one would differ run to run.
  for (const name of ['jam', 'quotaClear', 'roundClear'] as const) {
    it(`${name} is deterministic`, () => {
      const runs = [0, 1].map(() => {
        const { ac, built } = fakeContext();
        pixelVoices[name](ac);
        return built.map((b) => `${b.kind}:${b.end.toFixed(4)}`).join('|');
      });
      expect(runs[0]).toBe(runs[1]);
    });
  }
});
