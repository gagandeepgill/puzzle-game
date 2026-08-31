import { describe, expect, it } from 'vitest';
import {
  EPOCH_DATE_KEY, dailyRng, dayNumber, hashDateKey, mulberry32,
  utcDateKey, variantForDay, yesterdayKey,
} from '../rng.js';
import { VARIANTS } from '../content.js';

describe('utcDateKey', () => {
  it('reads the UTC day, not the local one', () => {
    // 23:30 on the 5th in UTC is already the 6th in Sydney and still the 5th
    // in New York. Using local time would hand those players different
    // puzzles and break streaks across midnight.
    expect(utcDateKey(new Date('2026-09-05T23:30:00Z'))).toBe('2026-09-05');
    expect(utcDateKey(new Date('2026-09-06T00:30:00Z'))).toBe('2026-09-06');
  });
});

describe('dayNumber', () => {
  it('numbers the epoch as day 1 and counts up from there', () => {
    expect(dayNumber(EPOCH_DATE_KEY)).toBe(1);
    expect(dayNumber('2026-09-01')).toBe(2);
    expect(dayNumber('2026-09-30')).toBe(31);
  });

  it('clamps dates before the epoch to day 1 rather than going negative', () => {
    // A negative day would index VARIANTS out of bounds and throw. Someone
    // with a wrong system clock should get a playable puzzle, not a crash.
    expect(dayNumber('2020-01-01')).toBe(1);
    expect(dayNumber('2026-08-30')).toBe(1);
  });

  it('is unaffected by daylight saving, because it is all UTC', () => {
    // 2027-03-14 is a US DST transition. A local-time implementation would
    // lose or gain an hour here and round to the wrong day.
    expect(dayNumber('2027-03-15') - dayNumber('2027-03-13')).toBe(2);
  });
});

describe('yesterdayKey', () => {
  it('steps back across month, leap-year and year boundaries', () => {
    // The streak check compares against this, so an off-by-one on any of
    // these silently resets a player's streak once a month.
    expect(yesterdayKey('2026-03-01')).toBe('2026-02-28');
    expect(yesterdayKey('2028-03-01')).toBe('2028-02-29');
    expect(yesterdayKey('2027-01-01')).toBe('2026-12-31');
    expect(yesterdayKey('2026-09-01')).toBe('2026-08-31');
  });
});

describe('variantForDay', () => {
  it('rotates through every variant and wraps', () => {
    const seen = Array.from({ length: VARIANTS.length }, (_, i) => variantForDay(i + 1));
    expect(new Set(seen.map((v) => v.name)).size).toBe(VARIANTS.length);
    expect(variantForDay(VARIANTS.length + 1)).toBe(variantForDay(1));
  });
});

describe('seeding', () => {
  it('gives the same sequence for the same day and difficulty', () => {
    const draw = (r: () => number) => Array.from({ length: 8 }, r);
    expect(draw(dailyRng('2026-09-01', 'easy')))
      .toEqual(draw(dailyRng('2026-09-01', 'easy')));
  });

  it('salts by difficulty, so playing Easy cannot spoil Hard', () => {
    const draw = (r: () => number) => Array.from({ length: 8 }, r);
    expect(draw(dailyRng('2026-09-01', 'easy')))
      .not.toEqual(draw(dailyRng('2026-09-01', 'hard')));
  });

  it('stays inside [0, 1)', () => {
    const r = mulberry32(hashDateKey('2026-09-01:easy'));
    for (let i = 0; i < 5000; i++) {
      const n = r();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
    }
  });
});
