/**
 * The skin is presentation only, so the things worth testing are that it
 * survives a bad value in storage and that the sprite coverage claim matches
 * the files actually on disk.
 *
 * That second one is the point. The supplied pack was missing four of the ten
 * parts, and a coverage set that drifts from the filesystem would render a
 * broken image in a board cell rather than falling back to the SVG glyph.
 */
import { existsSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SKIN, SKINS, loadSkin, saveSkin } from '../pixel/skin.js';
import { PIXEL_PARTS, hasPixelArt } from '../pixel/PixelSprite.js';
import { PART_KEYS } from '../../game/types.js';

const spriteFor = (part: string) =>
  new URL(`../../../public/assets/pixel/parts/${part}.png`, import.meta.url);

afterEach(() => { vi.unstubAllGlobals(); });

function stubStorage(initial: Record<string, string> = {}) {
  const data = { ...initial };
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => data[k] ?? null,
    setItem: (k: string, v: string) => { data[k] = v; },
  });
  return data;
}

describe('skin persistence', () => {
  it('round-trips a saved skin', () => {
    stubStorage();
    saveSkin('pixel');
    expect(loadSkin()).toBe('pixel');
  });

  it('falls back to the default when storage holds something else', () => {
    // The vanilla build wrote neighbouring keys with different shapes, and
    // reading one back with a cast is how the HUD once reported `undefined`.
    stubStorage({ 'payload.skin.v1': 'neon-hologram' });
    expect(loadSkin()).toBe(DEFAULT_SKIN);
  });

  it('falls back when storage throws', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => { throw new Error('blocked'); },
      setItem: () => { throw new Error('blocked'); },
    });
    expect(loadSkin()).toBe(DEFAULT_SKIN);
    expect(() => saveSkin('pixel')).not.toThrow();
  });

  it('the default is one of the known skins', () => {
    expect(SKINS).toContain(DEFAULT_SKIN);
  });
});

describe('pixel sprite coverage', () => {
  it('every part claimed to have art has a file on disk', () => {
    for (const part of PIXEL_PARTS) {
      expect(existsSync(spriteFor(part)), `missing sprite for ${part}`).toBe(true);
    }
  });

  it('every part with a file on disk is claimed', () => {
    // The other direction: dropping a PNG in without adding the key would
    // leave it rendering the SVG glyph and look like the file did nothing.
    for (const part of PART_KEYS) {
      if (existsSync(spriteFor(part))) {
        expect(hasPixelArt(part), `${part}.png exists but is not in PIXEL_PARTS`).toBe(true);
      }
    }
  });

  it('records which parts the supplied pack did not include', () => {
    // Not a floor, a ledger. When the four missing sprites arrive this fails,
    // which is the reminder to update it and the coverage set together.
    const missing = PART_KEYS.filter((p) => !hasPixelArt(p));
    expect(missing).toEqual(['weight', 'anvil', 'reso', 'fork']);
  });
});
