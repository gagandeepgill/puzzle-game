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
import { PART_SPRITE, PIXEL_PARTS, UI_SPRITE, hasPixelArt } from '../pixel/PixelSprite.js';
import { PART_KEYS } from '../../game/types.js';

// Resolved through the map, because the pack is half PNG and half WebP.
const fileFor = (webPath: string) =>
  new URL(`../../../public${webPath}`, import.meta.url);

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
  it('every one of the ten parts has a sprite file on disk', () => {
    // The pack is complete now. This replaces the ledger that recorded
    // weight, anvil, reso and fork as missing.
    for (const part of PART_KEYS) {
      expect(PART_SPRITE[part], `no path mapped for ${part}`).toBeTruthy();
      expect(existsSync(fileFor(PART_SPRITE[part])), `missing file for ${part}`).toBe(true);
    }
  });

  it('claims art for every part, so nothing falls back to the SVG glyph', () => {
    for (const part of PART_KEYS) expect(hasPixelArt(part), part).toBe(true);
  });

  it('the two interface sprites resolve', () => {
    for (const [name, path] of Object.entries(UI_SPRITE)) {
      expect(existsSync(fileFor(path)), `missing ${name}`).toBe(true);
    }
  });

  it('maps every part to a distinct file', () => {
    // Two parts pointing at one sprite is the failure mode this pack kept
    // producing: several drops arrived with duplicate images under different
    // names, and a board where Anvil and Weight look identical is unreadable.
    const paths = PART_KEYS.map((p) => PART_SPRITE[p]);
    expect(new Set(paths).size, 'two parts share a sprite').toBe(paths.length);
  });
});
