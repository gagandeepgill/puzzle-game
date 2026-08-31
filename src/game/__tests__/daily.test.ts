import { describe, expect, it } from 'vitest';
import {
  EMPTY_STREAK, bumpStreak, recordFor, shareText, streakIsLive,
} from '../daily.js';
import { VARIANTS } from '../content.js';
import type { DailyRecord } from '../daily.js';

const rec = (over: Partial<DailyRecord> = {}): DailyRecord => ({
  dateKey: '2026-09-05',
  difficulty: 'easy',
  won: true,
  rounds: 4,
  of: 4,
  total: 210,
  bestDrop: 96,
  ...over,
});

describe('recordFor', () => {
  it('keeps the first attempt at a day', () => {
    // Without this a player replays until they win and the record, the
    // streak and anything built on them mean nothing.
    const first = rec({ won: false, rounds: 2, total: 40 });
    const replay = rec({ won: true, total: 500 });
    expect(recordFor(first, replay)).toBe(first);
  });

  it('takes the new attempt when the stored one is from another day', () => {
    const yesterday = rec({ dateKey: '2026-09-04' });
    const today = rec();
    expect(recordFor(yesterday, today)).toBe(today);
    expect(recordFor(null, today)).toBe(today);
  });
});

describe('bumpStreak', () => {
  it('extends across consecutive won days', () => {
    let s = bumpStreak(EMPTY_STREAK, '2026-09-03', true);
    expect(s.count).toBe(1);
    s = bumpStreak(s, '2026-09-04', true);
    s = bumpStreak(s, '2026-09-05', true);
    expect(s).toEqual({ last: '2026-09-05', count: 3 });
  });

  it('restarts at 1 after a skipped day', () => {
    const s = bumpStreak({ last: '2026-09-01', count: 7 }, '2026-09-05', true);
    expect(s).toEqual({ last: '2026-09-05', count: 1 });
  });

  it('ends the streak on a loss rather than pausing it', () => {
    const s = bumpStreak({ last: '2026-09-04', count: 7 }, '2026-09-05', false);
    expect(s).toEqual({ last: '2026-09-05', count: 0 });
  });

  it('is idempotent for a day already counted, so replays cannot inflate it', () => {
    const s = { last: '2026-09-05', count: 3 };
    expect(bumpStreak(s, '2026-09-05', true)).toBe(s);
  });

  it('crosses a month boundary', () => {
    const s = bumpStreak({ last: '2026-08-31', count: 2 }, '2026-09-01', true);
    expect(s.count).toBe(3);
  });
});

describe('streakIsLive', () => {
  it('holds while today or yesterday extended it', () => {
    expect(streakIsLive({ last: '2026-09-05', count: 3 }, '2026-09-05')).toBe(true);
    expect(streakIsLive({ last: '2026-09-04', count: 3 }, '2026-09-05')).toBe(true);
  });

  it('goes stale after a missed day, instead of reading as still running', () => {
    expect(streakIsLive({ last: '2026-09-03', count: 3 }, '2026-09-05')).toBe(false);
    expect(streakIsLive(EMPTY_STREAK, '2026-09-05')).toBe(false);
  });
});

describe('shareText', () => {
  const variant = VARIANTS[0] ?? null;

  it('names the day and outcome without leaking the board', () => {
    const text = shareText(rec(), variant, { last: '2026-09-05', count: 4 });
    expect(text).toContain('Payload Daily #6');
    expect(text).toContain('cleared 4/4');
    expect(text).toContain('banked 210');
    expect(text).toContain('4-day streak');
    // Nothing that would spoil the draft or the layout.
    for (const leak of ['weight', 'coil', 'prism', 'row', 'column']) {
      expect(text.toLowerCase()).not.toContain(leak);
    }
  });

  it('reports where a lost run stalled', () => {
    const text = shareText(rec({ won: false, rounds: 2 }), variant, EMPTY_STREAK);
    expect(text).toContain('stalled at 2/4');
  });

  it('omits a stale streak', () => {
    const text = shareText(rec(), variant, { last: '2026-08-01', count: 9 });
    expect(text).not.toContain('streak');
  });
});
