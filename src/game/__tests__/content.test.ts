/**
 * The compendium renders straight from these tables, so a part added without
 * content would silently be missing from the only place a player can look it
 * up. These fail instead.
 */
import { describe, expect, it } from 'vitest';
import { BLUEPRINTS, DIFFICULTIES, JAMS, PARTS, SCALER_KEYS } from '../content.js';
import { BLUEPRINT_KEYS, PART_KEYS } from '../types.js';
import type { JamKey } from '../types.js';

describe('parts', () => {
  it('every part is describable: name, glyph, badge, rule, role', () => {
    for (const key of PART_KEYS) {
      const p = PARTS[key];
      expect(p, key).toBeDefined();
      for (const field of ['name', 'glyph', 'badge', 'rule'] as const) {
        expect(p[field].trim(), `${key}.${field}`).not.toBe('');
      }
      expect(['add', 'multiply', 'route']).toContain(p.role);
    }
  });

  it('rules read as sentences, so the compendium is not a table of fragments', () => {
    for (const key of PART_KEYS) {
      expect(PARTS[key].rule.trim().endsWith('.'), key).toBe(true);
    }
  });

  it('every scaler is a real part, and none of them merely add', () => {
    for (const key of SCALER_KEYS) {
      expect(PART_KEYS).toContain(key);
      expect(PARTS[key].role, key).not.toBe('add');
    }
  });
});

describe('blueprints', () => {
  it('every blueprint is describable', () => {
    for (const key of BLUEPRINT_KEYS) {
      const b = BLUEPRINTS[key];
      expect(b, key).toBeDefined();
      expect(b.name.trim(), key).not.toBe('');
      expect(b.glyph.trim(), key).not.toBe('');
      expect(b.rule.trim().endsWith('.'), key).toBe(true);
    }
  });
});

describe('JAMS', () => {
  it('covers every jam any difficulty can inflict, exactly once', () => {
    const used = new Set<JamKey>();
    for (const d of Object.values(DIFFICULTIES)) {
      for (const jam of Object.values(d.jams)) if (jam) used.add(jam.key);
    }
    expect(new Set(JAMS.map((j) => j.key))).toEqual(used);
    expect(JAMS).toHaveLength(used.size);
  });

  it('separates the name from the rule, so the banner and the reference agree', () => {
    for (const jam of JAMS) {
      expect(jam.name.trim()).not.toBe('');
      expect(jam.rule.trim().endsWith('.'), jam.key).toBe(true);
      // The banner composes "⚠ JAM — <name>: <rule>", so neither half may
      // already carry that decoration.
      expect(jam.name).not.toContain('JAM');
      expect(jam.rule).not.toContain('⚠');
    }
  });
});
