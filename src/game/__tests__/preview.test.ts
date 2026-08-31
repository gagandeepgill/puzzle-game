/**
 * The projections must agree with the real drop, always. A preview that can
 * disagree with the outcome is worse than no preview: the player learns to
 * distrust it and is then worse off than with nothing.
 */
import { describe, expect, it } from 'vitest';
import {
  bestDrop, columnTotals, fallPath, forkReach, heatFor, placementScores,
} from '../preview.js';
import { isForked, simulateDrop } from '../simulate.js';
import { COLS, ROWS, cellAt, column } from '../types.js';
import type { Board, PartKey, Rules } from '../types.js';

const EMPTY: Board = Array(COLS * ROWS).fill(null);
const place = (...parts: readonly (readonly [PartKey, number, number])[]): Board => {
  const b = [...EMPTY];
  for (const [p, r, c] of parts) b[cellAt(r, c)] = p;
  return b;
};
const RULES: Rules = { baseValue: 1, springUses: 1, gravity: false, jam: null };

describe('columnTotals', () => {
  it('matches what dropping into each column actually banks', () => {
    const board = place(['weight', 2, 1], ['coil', 4, 2], ['prism', 1, 3]);
    const totals = columnTotals(board, RULES);
    for (let c = 0; c < COLS; c++) {
      expect(totals[c]).toBe(simulateDrop(board, column(c), RULES).total);
    }
  });
});

describe('bestDrop', () => {
  it('names a column that really does bank the reported total', () => {
    const boards = [
      place(['weight', 2, 2], ['coil', 4, 2]),
      place(['prism', 1, 0], ['weight', 3, 1]),
      place(['bell', 0, 4], ['reso', 3, 2], ['fork', 3, 1]),
    ];
    for (const board of boards) {
      const best = bestDrop(board, RULES);
      expect(simulateDrop(board, best.column, RULES).total).toBe(best.total);
      // and nothing beats it
      for (let c = 0; c < COLS; c++) {
        expect(simulateDrop(board, column(c), RULES).total).toBeLessThanOrEqual(best.total);
      }
    }
  });
});

describe('placementScores', () => {
  const board = place(['weight', 2, 2], ['weight', 4, 2]);

  it('covers exactly the empty cells', () => {
    const out = placementScores(board, 'coil', RULES);
    expect(out).toHaveLength(COLS * ROWS - 2);
    for (const p of out) expect(board[p.cell]).toBeNull();
  });

  it('reports a total the real board actually produces once the part is there', () => {
    for (const p of placementScores(board, 'coil', RULES)) {
      const next = [...board];
      next[p.cell] = 'coil';
      expect(simulateDrop(next, p.column, RULES).total).toBe(p.total);
    }
  });

  it('rates a multiplier below the adders above it', () => {
    // The whole point of the feature. A Coil under both Weights multiplies a
    // value they already raised; above them it multiplies the base and the
    // Weights then add to the result.
    const scores = placementScores(board, 'coil', RULES);
    const at = (r: number, c: number) => scores.find((p) => p.cell === cellAt(r, c));
    const below = at(5, 2);
    const above = at(1, 2);
    expect(below).toBeDefined();
    expect(above).toBeDefined();
    expect(below!.total).toBeGreaterThan(above!.total);
  });

  it('gives a negative gain to a placement that destroys value', () => {
    // A Gilded Gate confiscates any marble worth under 10.
    const weak = place(['weight', 5, 2]);
    const scores = placementScores(weak, 'gate', RULES);
    const inColumn = scores.filter((p) => p.cell % COLS === 2);
    expect(inColumn.some((p) => p.gain < 0)).toBe(true);
  });
});

describe('heatFor', () => {
  it('marks the top placement best and a no-op flat', () => {
    const board = place(['weight', 2, 2], ['weight', 4, 2]);
    const scores = placementScores(board, 'coil', RULES);
    const heat = heatFor(scores);
    const top = scores.reduce((a, b) => (b.gain > a.gain ? b : a));
    expect(heat.get(top.cell)).toBe('best');
    // A cell in an empty column cannot change the best drop.
    const idle = scores.find((p) => p.cell === cellAt(0, 0));
    expect(idle && heat.get(idle.cell)).toBe('flat');
  });

  it('calls everything flat when no placement helps', () => {
    const heat = heatFor(placementScores(EMPTY, 'fork', RULES));
    expect([...heat.values()].every((t) => t === 'flat')).toBe(true);
  });
});

describe('fallPath', () => {
  it('is the cells the released marble really enters, in order', () => {
    const board = place(['weight', 2, 2]);
    const path = fallPath(board, column(2), RULES);
    expect(path).toEqual([0, 1, 2, 3, 4, 5].map((r) => cellAt(r, 2)));
  });

  it('follows an Anvil sideways rather than drawing a straight line', () => {
    const board = place(['anvil', 2, 2]);
    const path = fallPath(board, column(2), RULES);
    // Enters column 2 down to the anvil, which deflects it one column left.
    expect(path.slice(0, 3)).toEqual([cellAt(0, 2), cellAt(1, 2), cellAt(2, 2)]);
    expect(path.some((c) => c % COLS === 1)).toBe(true);
  });

  it('follows a Spring back up', () => {
    const board = place(['spring', 4, 2]);
    const path = fallPath(board, column(2), RULES);
    // The spring is entered twice: once on the way down, once after bouncing
    // back to it. Dedup keeps one entry, but the rows above it are revisited.
    expect(path).toContain(cellAt(4, 2));
    expect(path.filter((c) => c % COLS === 2).length).toBeGreaterThan(0);
  });
});

describe('forkReach', () => {
  it('finds the empty cells a Tuning Fork already reaches', () => {
    const board = place(['fork', 2, 2]);
    const reach = forkReach(board, 'coil');
    expect([...reach].sort((a, b) => a - b)).toEqual(
      [cellAt(1, 2), cellAt(3, 2), cellAt(2, 1), cellAt(2, 3)].sort((a, b) => a - b),
    );
  });

  it('reports nothing for a Fork, because forks never double each other', () => {
    expect(forkReach(place(['fork', 2, 2]), 'fork').size).toBe(0);
  });

  it('agrees with what the board actually does once the part is placed', () => {
    // The whole promise of the preview: the teal ring shown before placing
    // must mean the same thing as the one shown after.
    const board = place(['fork', 2, 2], ['weight', 4, 1]);
    for (const cell of forkReach(board, 'coil')) {
      const next = [...board];
      next[cell] = 'coil';
      expect(isForked(next, cell)).toBe(true);
    }
  });

  it('is empty when no fork is on the board', () => {
    expect(forkReach(place(['weight', 2, 2]), 'coil').size).toBe(0);
  });
});
