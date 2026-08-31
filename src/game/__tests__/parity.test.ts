/**
 * Differential test against the shipped implementation.
 *
 * `referenceDrop` below is a faithful transcription of `runMarble` and `drop`
 * from demo/payload.html with the rendering stripped out. It is deliberately
 * written in the original's style, not refactored, so that agreement between
 * it and simulate.ts means something.
 *
 * Random boards are then run through both. If the port ever diverges from the
 * game people are actually playing, this fails.
 */
import { describe, expect, it } from 'vitest';
import { simulateDrop } from '../simulate.js';
import { COLS, ROWS, MARBLE_CAP, cellAt, column } from '../types.js';
import type { Board, PartKey, Rules } from '../types.js';
import { PART_KEYS } from '../types.js';

/* ---------- reference: the original, minus the DOM ---------- */

interface RefMarble {
  v: number; col: number; row: number; touched: number;
  reso: boolean; slipped: boolean; springs: Map<number, number>;
}

function referenceDrop(board: Board, col: number, rules: Rules): number {
  const idx = (r: number, c: number) => r * COLS + c;

  const isForked = (r: number, c: number): boolean => {
    const t = board[idx(r, c)];
    if (!t || t === 'fork') return false;
    return ([[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]] as const).some(
      ([rr, cc]) => rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && board[idx(rr, cc)] === 'fork');
  };

  const base = rules.baseValue;
  const queue: RefMarble[] = [
    { v: base, col, row: 0, touched: 0, reso: false, slipped: false, springs: new Map() },
  ];
  const bellsOff = rules.jam === 'noBells';
  if (!bellsOff) {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[idx(r, c)] === 'bell' && queue.length < MARBLE_CAP) {
          queue.push({ v: base, col: c, row: 0, touched: 0, reso: false, slipped: false, springs: new Map() });
        }
      }
    }
  }
  const stats = { marbles: queue.length };
  const gravity = rules.gravity;
  const slippery = rules.jam === 'slippery';
  let banked = 0;

  while (queue.length) {
    const m = queue.shift() as RefMarble;
    let r = m.row, c = m.col, steps = 0;
    let confiscated = false;

    while (r < ROWS && steps++ < 120) {
      if (gravity) m.v += 1;
      const t = board[idx(r, c)];
      if (t) {
        if (slippery && !m.slipped) {
          m.slipped = true;
          r += 1;
          continue;
        }
        const doubled = isForked(r, c);
        const k = doubled ? 2 : 1;
        m.touched += 1;

        if (t === 'weight') m.v += 3 * k;
        else if (t === 'anvil') { m.v += 8 * k; if (c > 0) c -= 1; }
        else if (t === 'coil') m.v *= 2 * k;
        else if (t === 'wire') m.v += (m.touched - 1) * k;
        else if (t === 'reso') {
          const mult = m.reso ? 3 * k : 1.5 * k;
          m.v = Math.round(m.v * mult);
          m.reso = true;
        } else if (t === 'gate') {
          if (m.v >= 10) m.v *= 3 * k;
          else { confiscated = true; break; }
        } else if (t === 'prism') {
          if (stats.marbles < MARBLE_CAP) {
            const nc = c + 1 < COLS ? c + 1 : c - 1;
            queue.push({ v: m.v, col: nc, row: r + 1, touched: m.touched,
              reso: m.reso, slipped: m.slipped, springs: new Map(m.springs) });
            stats.marbles += 1;
          }
        } else if (t === 'spring') {
          const key = idx(r, c);
          const used = m.springs.get(key) || 0;
          if (used < rules.springUses) {
            m.springs.set(key, used + 1);
            r = Math.max(0, r - 2 - (doubled ? 2 : 0));
            continue;
          }
        }
      }
      r += 1;
    }
    if (!confiscated) banked += m.v;
  }
  return banked;
}

/* ---------- fuzz ---------- */

/** Small deterministic PRNG so a failure is reproducible from its seed. */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

function randomBoard(rand: () => number, density: number): Board {
  const b: (PartKey | null)[] = Array(COLS * ROWS).fill(null);
  for (let i = 0; i < b.length; i++) {
    if (rand() < density) {
      const k = PART_KEYS[Math.floor(rand() * PART_KEYS.length)];
      if (k) b[i] = k;
    }
  }
  return b;
}

describe('parity with the shipped implementation', () => {
  it('agrees on 4000 random boards across every rule combination', () => {
    const rand = lcg(0xC0FFEE);
    const jams: readonly (Rules['jam'])[] = [null, 'slippery', 'noBells'];
    let checked = 0;
    const mismatches: string[] = [];

    for (let i = 0; i < 4000; i++) {
      const density = 0.1 + (i % 5) * 0.15;
      const board = randomBoard(rand, density);
      const rules: Rules = {
        baseValue: 1 + (i % 3),
        springUses: 1 + (i % 2),
        gravity: i % 4 === 0,
        jam: jams[i % jams.length] ?? null,
      };
      const col = Math.floor(rand() * COLS);

      const mine = simulateDrop(board, column(col), rules).total;
      const theirs = referenceDrop(board, col, rules);
      checked++;
      if (mine !== theirs) {
        mismatches.push(
          `i=${i} col=${col} rules=${JSON.stringify(rules)} mine=${mine} ref=${theirs} ` +
          `board=${board.map((p) => p ?? '.').join(',')}`);
        if (mismatches.length >= 3) break;
      }
    }

    expect(mismatches).toEqual([]);
    expect(checked).toBe(4000);
  });

  it('agrees on the starting boards both difficulties actually ship', () => {
    const easy: Board = (() => {
      const b: (PartKey | null)[] = Array(COLS * ROWS).fill(null);
      b[cellAt(2, 2)] = 'weight'; b[cellAt(4, 2)] = 'weight'; b[cellAt(5, 2)] = 'coil';
      return b;
    })();
    const hard: Board = (() => {
      const b: (PartKey | null)[] = Array(COLS * ROWS).fill(null);
      b[cellAt(2, 2)] = 'weight'; b[cellAt(4, 2)] = 'weight';
      return b;
    })();

    for (const board of [easy, hard]) {
      for (let c = 0; c < COLS; c++) {
        const rules: Rules = { baseValue: 3, springUses: 1, gravity: false, jam: null };
        expect(simulateDrop(board, column(c), rules).total)
          .toBe(referenceDrop(board, c, rules));
      }
    }
  });
});
