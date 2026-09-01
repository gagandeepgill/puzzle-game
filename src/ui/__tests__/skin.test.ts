/**
 * The skin is presentation only, so the things worth testing are that it
 * survives a bad value in storage and that the sprite coverage claim matches
 * the files actually on disk.
 *
 * That second one is the point. The supplied pack was missing four of the ten
 * parts, and a coverage set that drifts from the filesystem would render a
 * broken image in a board cell rather than falling back to the SVG glyph.
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_SKIN, SKINS, SKIN_LABEL, loadSkin, saveSkin } from '../pixel/skin.js';
import { PART_SPRITE, PIXEL_PARTS, UI_SPRITE, hasPixelArt } from '../pixel/PixelSprite.js';
import { BOARD_FRAME, CARD_ART, LOGO_ART, MARBLE_ART, PLATE_ART, SCORE_BURST } from '../pixel/hudArt.js';
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

  it('round-trips every skin, so adding one cannot half-land', () => {
    // The picker maps over SKINS. A skin listed there but rejected by the
    // validator would render a tab that silently does nothing.
    for (const skin of SKINS) {
      stubStorage();
      saveSkin(skin);
      expect(loadSkin(), skin).toBe(skin);
    }
  });

  it('names every skin in the picker', () => {
    for (const skin of SKINS) {
      expect(SKIN_LABEL[skin], skin).toBeTruthy();
    }
    expect(new Set(Object.values(SKIN_LABEL)).size).toBe(SKINS.length);
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

/**
 * The game skin's HUD art.
 *
 * These are crops out of an eight-sheet pack, and the sheets themselves are
 * not in `public/`, so a path that drifts cannot be caught by the build: it
 * ships as a broken image on a board cell or a draft card. Hence checking the
 * files rather than the constants.
 */
describe('game HUD art', () => {
  const paths = [
    ...Object.values(CARD_ART), LOGO_ART.src, BOARD_FRAME, MARBLE_ART, SCORE_BURST, PLATE_ART,
  ];

  it('every referenced file is on disk', () => {
    for (const path of paths) {
      expect(existsSync(fileFor(path)), `missing ${path}`).toBe(true);
    }
  });

  it('maps every state to a distinct file', () => {
    // Two states sharing a file is the failure that looks like nothing
    // happened: a valid cell and an invalid one would draw the same tile.
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('ships only what it references', () => {
    // The pack is 6.7MB of source sheets. Anything unreferenced under the
    // shipped directory is weight in `dist/` that nobody asked for.
    const dir = new URL('../../../public/assets/pixel/hud/', import.meta.url);
    const walk = (u: URL): string[] => readdirSync(u, { withFileTypes: true })
      .flatMap((e) => (e.isDirectory()
        ? walk(new URL(`${e.name}/`, u))
        : [`${u.pathname.split('/public')[1]}${e.name}`]));
    expect(walk(dir).sort()).toEqual([...paths].sort());
  });

  it('records a crop rectangle for every piece', () => {
    // The source sheets are 1448x1086 and the pieces were located by
    // measurement. Losing the rectangles means re-deriving them by eye.
    // At least one per shipped file, and more where a piece was composed out
    // of several: the board frame names two.
    const src = readFileSync(new URL('../pixel/hudArt.ts', import.meta.url), 'utf8');
    const rects = src.match(/\d+,\d+ \d+x\d+/g) ?? [];
    expect(rects.length).toBeGreaterThanOrEqual(paths.length);
  });
});

/**
 * The game skin styles board cells by matching their accessible name.
 *
 * `game.css` selects on `[aria-label^='Row']` and `[aria-label*='press to
 * install']` because `Board` is shared and takes no skin prop. That couples
 * presentation to English copy: reword either string and every cell silently
 * loses its tile, with nothing failing. This is the thing that would fail.
 */
describe('game cell selectors', () => {
  const board = readFileSync(new URL('../Board.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../pixel/game.css', import.meta.url), 'utf8');

  it('Board still builds the label game.css matches on', () => {
    expect(board, 'the cell label no longer starts with Row').toContain('`Row ${row + 1}');
    expect(board, 'the installable hint was reworded').toContain('press to install');
  });

  it('game.css still matches on it', () => {
    expect(css).toContain("[aria-label^='Row']");
    expect(css).toContain("[aria-label*='press to install']");
  });
});

/**
 * The game skin styles score pops by matching the class `Board` gives them.
 *
 * Same coupling as the cell selectors: `game.css` hangs off
 * `.animate-floatup` and `data-pop`, and `Board` is shared. Rename either and
 * the pops silently revert to the cockpit's sizing with nothing failing.
 */
describe('game score pop selectors', () => {
  const board = readFileSync(new URL('../Board.tsx', import.meta.url), 'utf8');
  const css = readFileSync(new URL('../pixel/game.css', import.meta.url), 'utf8');

  it('Board still emits the hooks game.css matches on', () => {
    expect(board, 'the float label lost its animation class').toContain('animate-floatup');
    expect(board, 'the pop tier is no longer on the element').toContain('data-pop={l.pop}');
  });

  it('game.css still matches on them', () => {
    expect(css).toContain('.animate-floatup');
    for (const tier of ['sm', 'md', 'lg']) {
      expect(css, tier).toContain(`[data-pop='${tier}']`);
    }
  });
});
