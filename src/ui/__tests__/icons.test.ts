/**
 * Every icon name in the content tables must resolve to a real path.
 *
 * The tables live in src/game and the paths in src/ui, so the compiler cannot
 * connect them without the engine importing a renderer module, which the
 * architecture forbids. This test is what stands in for that type edge: adding
 * a part with a typo'd icon name fails here instead of rendering an empty box.
 */
import { describe, expect, it } from 'vitest';
import { BLUEPRINTS, PARTS, VARIANTS } from '../../game/content.js';
import { PART_KEYS, BLUEPRINT_KEYS } from '../../game/types.js';
import { ICON_NAMES } from '../icons.js';

describe('icon coverage', () => {
  it('every part glyph resolves', () => {
    for (const key of PART_KEYS) expect(ICON_NAMES, key).toContain(PARTS[key].glyph);
  });

  it('every blueprint glyph resolves', () => {
    for (const key of BLUEPRINT_KEYS) expect(ICON_NAMES, key).toContain(BLUEPRINTS[key].glyph);
  });

  it('every variant icon resolves', () => {
    for (const v of VARIANTS) expect(ICON_NAMES, v.name).toContain(v.icon);
  });

  it('the result modal icons exist', () => {
    expect(ICON_NAMES).toContain('won');
    expect(ICON_NAMES).toContain('lost');
  });

  it('ships no icon nothing references', () => {
    const used = new Set<string>([
      ...PART_KEYS.map((k) => PARTS[k].glyph),
      ...BLUEPRINT_KEYS.map((k) => BLUEPRINTS[k].glyph),
      ...VARIANTS.map((v) => v.icon),
      'won', 'lost',
    ]);
    expect([...ICON_NAMES].filter((n) => !used.has(n))).toEqual([]);
  });
});
