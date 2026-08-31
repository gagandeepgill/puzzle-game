/**
 * What a placement or a drop would be worth, before committing to it.
 *
 * Every number here comes from `simulateDrop` — the same function the real
 * drop runs. That is the whole point: a projection that can disagree with the
 * outcome is worse than showing nothing, because the player learns to
 * distrust it and is then worse off than with no help at all.
 *
 * Pure, like the rest of src/game. No memoisation in here; the caller knows
 * when the board changed and can cache on that.
 */
import { isForked, simulateDrop } from './simulate.js';
import { COLS, ROWS, cellAt, cellIndex, column } from './types.js';
import type { Board, CellIndex, Column, PartKey, Rules } from './types.js';

/** What each column would bank if the player dropped into it right now. */
export function columnTotals(board: Board, rules: Rules): readonly number[] {
  return Array.from({ length: COLS }, (_, c) => simulateDrop(board, column(c), rules).total);
}

/** The best a single drop can do on this board, and where. */
export function bestDrop(board: Board, rules: Rules): { column: Column; total: number } {
  const totals = columnTotals(board, rules);
  let best = 0;
  for (let c = 1; c < COLS; c++) {
    if ((totals[c] ?? 0) > (totals[best] ?? 0)) best = c;
  }
  return { column: column(best), total: totals[best] ?? 0 };
}

export interface Placement {
  readonly cell: CellIndex;
  /** Best single drop achievable with the part installed here. */
  readonly total: number;
  /** How much better than leaving the part out entirely. Can be negative:
   *  a Gilded Gate in the wrong place destroys marbles. */
  readonly gain: number;
  /** Which column achieves `total`, so the fall path can be shown. */
  readonly column: Column;
}

/**
 * Every empty cell, scored by what the board's best drop becomes with `part`
 * installed there.
 *
 * COLS * ROWS cells times COLS columns is 150 simulations at the extreme.
 * Each one is a few hundred operations over a 30-cell board, so this is
 * cheap enough to run synchronously when the selection changes.
 */
export function placementScores(
  board: Board, part: PartKey, rules: Rules,
): readonly Placement[] {
  const baseline = bestDrop(board, rules).total;
  const out: Placement[] = [];

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = cellAt(r, c);
      if (board[cell] != null) continue;
      const next = [...board];
      next[cell] = part;
      const best = bestDrop(next, rules);
      out.push({ cell, total: best.total, gain: best.total - baseline, column: best.column });
    }
  }
  return out;
}

/** Four bands, not a raw number. */
export type HeatTier = 'best' | 'strong' | 'fair' | 'flat';

/**
 * Bands the placements so the board can shade them.
 *
 * Relative to the best available placement rather than to an absolute scale,
 * because what counts as a good gain changes by two orders of magnitude
 * between round 1 and round 8.
 */
export function heatFor(placements: readonly Placement[]): Map<CellIndex, HeatTier> {
  const out = new Map<CellIndex, HeatTier>();
  const bestGain = Math.max(0, ...placements.map((p) => p.gain));
  for (const p of placements) {
    // A placement that changes nothing is flat, however large the board's
    // score already is — the point is what this card does, not what the
    // machine was already worth.
    if (p.gain <= 0 || bestGain === 0) { out.set(p.cell, 'flat'); continue; }
    const share = p.gain / bestGain;
    out.set(p.cell, share >= 0.999 ? 'best' : share >= 0.5 ? 'strong' : share > 0 ? 'fair' : 'flat');
  }
  return out;
}

/**
 * The cells a marble passes through, in order, for a drop into `col`.
 *
 * Read off the event log rather than re-deriving the walk, so a Spring
 * bouncing back up or an Anvil deflecting sideways shows the real path
 * instead of a straight line down the column.
 */
export function fallPath(board: Board, col: Column, rules: Rules): readonly CellIndex[] {
  const seen: CellIndex[] = [];
  for (const e of simulateDrop(board, col, rules).events) {
    // The released marble is id 0. Echo Bell spawns and Prism copies have
    // their own paths, which would read as noise under a single highlight.
    if (e.kind === 'enter' && e.marble === 0 && !seen.includes(e.cell)) seen.push(e.cell);
  }
  return seen;
}

export { cellIndex };

/**
 * Empty cells where a Tuning Fork already reaches, so a part placed there
 * would fire doubled.
 *
 * The board already rings forked parts in teal after placement; this is the
 * same fact shown before committing, which is when it can change a decision.
 *
 * Returns nothing for a Fork itself — forks never double each other, so the
 * ring would be a lie.
 */
export function forkReach(board: Board, part: PartKey): ReadonlySet<CellIndex> {
  const out = new Set<CellIndex>();
  if (part === 'fork') return out;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const cell = cellAt(r, c);
      if (board[cell] != null) continue;
      // isForked reports on the part in a cell, so ask about a board where
      // this candidate is actually installed.
      const probe = [...board];
      probe[cell] = part;
      if (isForked(probe, cell)) out.add(cell);
    }
  }
  return out;
}
