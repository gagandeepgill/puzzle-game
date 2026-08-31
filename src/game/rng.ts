/**
 * Deterministic seeding.
 *
 * The date is the identity. Same UTC day plus same difficulty gives the same
 * run to every player, with no backend. Everything random in a daily comes
 * from here; nothing random happens while a drop resolves.
 */
import { VARIANTS } from './content.js';
import type { DifficultyKey, VariantDef } from './types.js';

/** Day 1. Changing this renumbers every daily, so don't. */
export const EPOCH_DATE_KEY = '2026-08-31';

/** UTC only. Local-time date maths gives players either side of midnight
 *  different puzzles and silently breaks streaks. */
export function utcDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}

export function dayNumber(dateKey: string): number {
  const ms = Date.parse(`${dateKey}T00:00:00Z`) - Date.parse(`${EPOCH_DATE_KEY}T00:00:00Z`);
  return Math.max(1, Math.round(ms / 86_400_000) + 1);
}

export function yesterdayKey(dateKey: string): string {
  return new Date(Date.parse(`${dateKey}T00:00:00Z`) - 86_400_000)
    .toISOString().slice(0, 10);
}

/** FNV-1a. */
export function hashDateKey(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}

export type Rng = () => number;

export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Salted by difficulty, so Easy and Hard never deal the same parts on the
 *  same day and playing one can't spoil the other. */
export function dailyRng(dateKey: string, difficulty: DifficultyKey): Rng {
  return mulberry32(hashDateKey(`${dateKey}:${difficulty}`));
}

export function variantForDay(day: number): VariantDef {
  const v = VARIANTS[(day - 1) % VARIANTS.length];
  if (!v) throw new Error('VARIANTS must not be empty');
  return v;
}
