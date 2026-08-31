/**
 * The localStorage binding for daily records and streaks.
 *
 * Every access is wrapped. Safari in private mode throws on setItem rather
 * than returning null, and a browser with site data blocked throws on read —
 * neither should take the game down, so a failure here just means the player
 * gets no record rather than no game.
 */
import { EMPTY_STREAK } from '../game/daily.js';
import type { DailyRecord, Streak } from '../game/daily.js';
import type { DifficultyKey } from '../game/types.js';

/*
 * v2, not v1.
 *
 * The vanilla build writes payload.daily.<difficulty>.v1 with a different
 * shape — `diff`, `cleared`, `best` where this uses `difficulty`, `rounds`,
 * `bestDrop`. Reading its record through this module produced a share string
 * reading "stalled at 4/undefined · best drop undefined" and reported an Easy
 * run as Hard, because `difficulty` was absent and the ternary fell through.
 * Anyone who played the vanilla game hits this on their first run here.
 */
const recordKey = (d: DifficultyKey) => `payload.daily.${d}.v2`;
const STREAK_KEY = 'payload.streak.v2';

/**
 * Parses and validates. A stored value is untrusted input like any other:
 * it may predate a schema change, or have been edited by hand.
 */
function read<T>(key: string, fallback: T, valid: (v: unknown) => v is T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    const parsed: unknown = JSON.parse(raw);
    return valid(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function isRecord(v: unknown): v is DailyRecord {
  if (typeof v !== 'object' || v === null) return false;
  const r = v as Partial<DailyRecord>;
  return typeof r.dateKey === 'string'
    && (r.difficulty === 'easy' || r.difficulty === 'hard')
    && typeof r.won === 'boolean'
    && typeof r.rounds === 'number'
    && typeof r.of === 'number'
    && typeof r.total === 'number'
    && typeof r.bestDrop === 'number';
}

function isStreak(v: unknown): v is Streak {
  if (typeof v !== 'object' || v === null) return false;
  const s = v as Partial<Streak>;
  return typeof s.last === 'string' && typeof s.count === 'number';
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // No record this session. Not worth interrupting the game over.
  }
}

export const loadRecord = (d: DifficultyKey): DailyRecord | null =>
  read<DailyRecord | null>(recordKey(d), null, (v): v is DailyRecord | null =>
    v === null || isRecord(v));

export const saveRecord = (rec: DailyRecord): void => write(recordKey(rec.difficulty), rec);

export const loadStreak = (): Streak => read<Streak>(STREAK_KEY, EMPTY_STREAK, isStreak);

export const saveStreak = (s: Streak): void => write(STREAK_KEY, s);
