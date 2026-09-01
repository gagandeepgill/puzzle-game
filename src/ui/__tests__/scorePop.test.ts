/**
 * How big a score pop reads.
 *
 * The reference sheet draws three sizes so a good hit is legible before the
 * digits are. The tier is decided once, off the label's own number, and the
 * renderer only applies it — which means the thresholds are worth pinning,
 * because nothing on screen fails when they drift, the pops just stop
 * meaning anything.
 */
import { describe, expect, it } from 'vitest';
import { popFor } from '../usePayloadRun.js';

describe('score pop tiers', () => {
  it('scales a gain by its magnitude', () => {
    expect(popFor('+1')).toBe('sm');
    expect(popFor('+7')).toBe('sm');
    expect(popFor('+8')).toBe('md');
    expect(popFor('+19')).toBe('md');
    expect(popFor('+20')).toBe('lg');
    expect(popFor('+140')).toBe('lg');
  });

  it('scores a multiplier on the multiplier, not on its digits', () => {
    // ×2 and ×4 are the same two characters. A ×4 is the bigger moment, so
    // the number inside has to be what is read, not the string length.
    expect(popFor('×2')).toBe('sm');
    expect(popFor('×3')).toBe('md');
    expect(popFor('×4')).toBe('lg');
  });

  it('treats a loss by size, like a gain', () => {
    expect(popFor('-2')).toBe('sm');
    expect(popFor('-30')).toBe('lg');
  });

  it('reads the real labels the engine emits, decorations and all', () => {
    // These are the exact strings from applyPart, not invented ones. The
    // anvil's carries a direction arrow and the resonator's is fractional,
    // and both were the cases most likely to parse to NaN.
    expect(popFor('+8 ⬅')).toBe('md');
    expect(popFor('+16 ⬅')).toBe('md');
    expect(popFor('×1.5')).toBe('sm');
    expect(popFor('×3')).toBe('md');
    expect(popFor('×6')).toBe('lg');
  });

  it('falls back to the middle for a label with no number in it', () => {
    // SPLIT and ↑↑ are events, not values. They still float, so they still
    // need a size; the fallback keeps them legible without shouting.
    for (const text of ['SPLIT', '↑↑', '']) {
      expect(popFor(text), text).toBe('md');
    }
  });
});
