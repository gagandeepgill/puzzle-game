/**
 * Daily results, streaks and the share string.
 *
 * Pure, like the rest of src/game: every function here takes the stored value
 * and returns the next one. Nothing touches localStorage — src/ui/store.ts
 * owns that, so this stays testable and the engine keeps its no-DOM rule.
 *
 * The rule that matters: the first attempt at a day is the one that counts.
 * Without it a player can replay until they win and the record means nothing,
 * which is the whole reason a daily has a record at all.
 */
import { dayNumber, yesterdayKey } from './rng.js';
import type { DifficultyKey, VariantDef } from './types.js';

export interface DailyRecord {
  readonly dateKey: string;
  readonly difficulty: DifficultyKey;
  readonly won: boolean;
  /** Rounds cleared, not rounds attempted. */
  readonly rounds: number;
  readonly of: number;
  readonly total: number;
  readonly bestDrop: number;
}

export interface Streak {
  /** The last day that extended the streak. */
  readonly last: string;
  readonly count: number;
}

export const EMPTY_STREAK: Streak = { last: '', count: 0 };

/**
 * Returns the record to store, which is the existing one when the player has
 * already attempted today. Callers should use the returned value rather than
 * the one they passed in: on a replay they differ, and the stored one wins.
 */
export function recordFor(existing: DailyRecord | null, attempt: DailyRecord): DailyRecord {
  if (existing && existing.dateKey === attempt.dateKey) return existing;
  return attempt;
}

/**
 * Streaks count consecutive *won* days. A loss ends it rather than pausing it,
 * and a day already counted is idempotent, so replaying cannot inflate it.
 */
export function bumpStreak(streak: Streak, dateKey: string, won: boolean): Streak {
  if (!won) return { last: dateKey, count: 0 };
  if (streak.last === dateKey) return streak;
  return streak.last === yesterdayKey(dateKey)
    ? { last: dateKey, count: streak.count + 1 }
    : { last: dateKey, count: 1 };
}

/** A streak is only current if it was extended today or yesterday. Otherwise
 *  it is a stale number that would read as still running. */
export function streakIsLive(streak: Streak, today: string): boolean {
  return streak.count > 0
    && (streak.last === today || streak.last === yesterdayKey(today));
}

/**
 * Deliberately spoiler-free: it names the day, the variant and the outcome,
 * and nothing about which parts were drafted or where they went.
 */
export function shareText(
  rec: DailyRecord, variant: VariantDef | null, streak: Streak,
): string {
  const day = dayNumber(rec.dateKey);
  const mode = rec.difficulty === 'easy' ? '🌤 Easy' : '🔥 Hard';
  const head = variant
    ? `Payload Daily #${day} ${variant.icon} ${variant.name}`
    : `Payload Daily #${day}`;
  const lines = [
    head,
    `${mode} · ${rec.won ? `cleared ${rec.of}/${rec.of}` : `stalled at ${rec.rounds}/${rec.of}`}`,
    `banked ${rec.total} · best drop ${rec.bestDrop}`,
  ];
  if (streakIsLive(streak, rec.dateKey)) lines.push(`⚙ ${streak.count}-day streak`);
  return lines.join('\n');
}
