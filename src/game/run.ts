/**
 * Run state transitions.
 *
 * A reducer over RunState. Pure, like the simulation: given a state and an
 * action it returns the next state. The view dispatches, plays back the
 * event log, and owns nothing about the rules.
 */
import { BLUEPRINTS, DIFFICULTIES, SCALER_KEYS, VARIANTS } from './content.js';
import { dailyRng, dayNumber, variantForDay } from './rng.js';
import type { Rng } from './rng.js';
import { simulateDrop } from './simulate.js';
import {
  COLS, ROWS, assertNever, cellAt, cellIndex,
} from './types.js';
import type {
  BlueprintKey, Board, CellIndex, Column, DifficultyKey, DropResult,
  Mode, PartKey, RunState, Rules,
} from './types.js';

export interface StartOptions {
  readonly mode: Mode;
  readonly difficulty: DifficultyKey;
  /** Required for daily runs so the seed is reproducible. */
  readonly dateKey?: string;
  /** Injectable for tests; defaults to the daily seed or Math.random. */
  readonly rng?: Rng;
}

export type Action =
  | { readonly type: 'selectOffer'; readonly index: number }
  | { readonly type: 'placeSelected'; readonly cell: CellIndex }
  | { readonly type: 'skipDraft' }
  | { readonly type: 'takeBlueprint'; readonly key: BlueprintKey }
  | { readonly type: 'movePart'; readonly from: CellIndex; readonly to: CellIndex }
  | { readonly type: 'applyDrop'; readonly result: DropResult };

/* ---------- derived values ---------- */

export const roundsIn = (s: RunState): number => s.difficulty.rounds;

export function quotaFor(s: RunState, round: number): number {
  const base = s.difficulty.quotas[round];
  if (base === undefined) throw new Error(`No quota for round ${round}`);
  return Math.round(base * (s.variant?.quotaMultiplier ?? 1));
}

export const jamFor = (s: RunState, round: number) => s.difficulty.jams[round] ?? null;

export function dropsForRound(s: RunState, round: number): number {
  const base = s.variant?.drops ?? s.difficulty.drops;
  const withBlueprint = base + (s.blueprints.has('overtime') ? 1 : 0);
  return jamFor(s, round)?.key === 'shortShift'
    ? Math.min(withBlueprint, 2)
    : withBlueprint;
}

/** Everything simulateDrop needs, derived from run state in one place. */
export function rulesFor(s: RunState): Rules {
  return {
    baseValue: (s.blueprints.has('lead') ? 2 : 1) + (s.variant?.baseBonus ?? 0),
    springUses: s.variant?.springUses ?? 1,
    gravity: s.blueprints.has('gravity'),
    jam: jamFor(s, s.round)?.key ?? null,
  };
}

/* ---------- drafting ---------- */

/**
 * Three offers, always containing at least one scaling part. A run that can't
 * win because the draft never offered a multiplier is unfair, not hard.
 */
export function rollOffers(pool: readonly PartKey[], rng: Rng): readonly PartKey[] {
  const shuffled = [...pool].sort(() => rng() - 0.5).slice(0, 3);
  if (!shuffled.some((p) => SCALER_KEYS.includes(p))) {
    const scalers = pool.filter((p) => SCALER_KEYS.includes(p));
    const pick = scalers[Math.floor(rng() * scalers.length)] ?? 'coil';
    shuffled[0] = pick;
  }
  return shuffled;
}

function poolFor(s: RunState): readonly PartKey[] {
  const pools = s.difficulty.pools;
  return pools[Math.min(s.round, pools.length - 1)] ?? pools[0] ?? [];
}

function rollBlueprints(held: ReadonlySet<BlueprintKey>, rng: Rng): readonly BlueprintKey[] {
  const available = (Object.keys(BLUEPRINTS) as BlueprintKey[]).filter((k) => !held.has(k));
  return [...available].sort(() => rng() - 0.5).slice(0, 3);
}

/* ---------- starting a run ---------- */

export function startRun(opts: StartOptions): { state: RunState; rng: Rng } {
  const difficulty = DIFFICULTIES[opts.difficulty];
  const isDaily = opts.mode === 'daily';
  const dateKey = opts.dateKey ?? '';
  const variant = isDaily ? variantForDay(dayNumber(dateKey)) : null;
  const rng = opts.rng ?? (isDaily ? dailyRng(dateKey, opts.difficulty) : Math.random);

  const board: (PartKey | null)[] = Array(COLS * ROWS).fill(null);
  for (const [part, r, c] of difficulty.start) board[cellAt(r, c)] = part;

  const base: RunState = {
    mode: opts.mode,
    difficulty,
    variant,
    board,
    round: 0,
    roundScore: 0,
    total: 0,
    bestDrop: 0,
    dropsLeft: 0,
    blueprints: new Set(),
    phase: { kind: 'drafting', offers: [], selected: null },
    screwUsed: false,
  };

  const state: RunState = {
    ...base,
    dropsLeft: dropsForRound(base, 0),
    phase: { kind: 'drafting', offers: rollOffers(poolFor(base), rng), selected: null },
  };
  return { state, rng };
}

/* ---------- transitions ---------- */

export function reduce(s: RunState, action: Action, rng: Rng): RunState {
  switch (action.type) {
    case 'selectOffer': {
      if (s.phase.kind !== 'drafting') return s;
      return { ...s, phase: { ...s.phase, selected: action.index } };
    }

    case 'placeSelected': {
      if (s.phase.kind !== 'drafting' || s.phase.selected === null) return s;
      if (s.board[action.cell] != null) return s;
      const part = s.phase.offers[s.phase.selected];
      if (!part) return s;
      const board = [...s.board];
      board[action.cell] = part;
      return { ...s, board, phase: { kind: 'playing' } };
    }

    case 'skipDraft': {
      if (s.phase.kind !== 'drafting') return s;
      return { ...s, phase: { kind: 'playing' } };
    }

    case 'takeBlueprint': {
      if (s.phase.kind !== 'blueprint') return s;
      const blueprints = new Set(s.blueprints);
      blueprints.add(action.key);
      const next = { ...s, blueprints };
      // Overtime changes the drop budget the moment it is taken.
      return { ...next, dropsLeft: dropsForRound(next, next.round), phase: { kind: 'playing' } };
    }

    case 'movePart': {
      if (s.screwUsed || !s.blueprints.has('screws')) return s;
      if (s.board[action.from] == null || s.board[action.to] != null) return s;
      const board = [...s.board];
      board[action.to] = board[action.from] ?? null;
      board[action.from] = null;
      return { ...s, board, screwUsed: true };
    }

    case 'applyDrop': {
      if (s.phase.kind !== 'playing') return s;
      const banked = action.result.total;
      const roundScore = s.roundScore + banked;
      const dropsLeft = s.dropsLeft - 1;
      const withScore: RunState = {
        ...s,
        roundScore,
        total: s.total + banked,
        bestDrop: Math.max(s.bestDrop, banked),
        dropsLeft,
      };

      if (roundScore >= quotaFor(withScore, s.round)) return advanceRound(withScore, rng);
      if (dropsLeft <= 0) return { ...withScore, phase: { kind: 'runOver', won: false } };
      return withScore;
    }

    default:
      return assertNever(action);
  }
}

function advanceRound(s: RunState, rng: Rng): RunState {
  const nextRound = s.round + 1;
  if (nextRound >= s.difficulty.rounds) {
    return { ...s, phase: { kind: 'runOver', won: true } };
  }

  const base: RunState = {
    ...s,
    round: nextRound,
    roundScore: 0,
    screwUsed: false,
  };
  const withDrops: RunState = { ...base, dropsLeft: dropsForRound(base, nextRound) };

  // A blueprint is offered after specific rounds; the part draft follows it.
  if (s.difficulty.blueprintAfter.includes(s.round)) {
    return { ...withDrops, phase: { kind: 'blueprint', offers: rollBlueprints(s.blueprints, rng) } };
  }
  return {
    ...withDrops,
    phase: { kind: 'drafting', offers: rollOffers(poolFor(withDrops), rng), selected: null },
  };
}

/** Convenience for the view: run the sim against current state. */
export function dropInto(s: RunState, col: Column): DropResult {
  return simulateDrop(s.board, col, rulesFor(s));
}

export { VARIANTS, DIFFICULTIES, BLUEPRINTS, cellIndex };
