/**
 * These tests exist to prove the extracted engine scores identically to the
 * vanilla build in demo/payload.html. Expected values were derived by hand
 * from the original runMarble, then checked against the live game.
 */
import { describe, expect, it } from 'vitest';
import { simulateDrop, isForked } from '../simulate.js';
import { COLS, ROWS, cellAt, column } from '../types.js';
import type { Board, PartKey, Rules } from '../types.js';

const EMPTY: Board = Array(COLS * ROWS).fill(null);

/** Board builder: place(['coil', 2, 2], ...) */
function place(...parts: readonly (readonly [PartKey, number, number])[]): Board {
  const b = [...EMPTY];
  for (const [part, r, c] of parts) b[cellAt(r, c)] = part;
  return b;
}

const RULES: Rules = { baseValue: 1, springUses: 1, gravity: false, jam: null };
const rules = (over: Partial<Rules> = {}): Rules => ({ ...RULES, ...over });

describe('simulateDrop', () => {
  it('banks the base value through an empty column', () => {
    const r = simulateDrop(EMPTY, column(0), rules());
    expect(r.total).toBe(1);
    expect(r.marbles).toBe(1);
  });

  it('adds before it multiplies, so order along the fall matters', () => {
    // Two weights above a coil: (1 + 3 + 3) * 2 = 14
    const above = place(['weight', 2, 2], ['weight', 3, 2], ['coil', 4, 2]);
    expect(simulateDrop(above, column(2), rules()).total).toBe(14);

    // Same three parts, coil first: ((1 * 2) + 3 + 3) = 8
    const below = place(['coil', 2, 2], ['weight', 3, 2], ['weight', 4, 2]);
    expect(simulateDrop(below, column(2), rules()).total).toBe(8);
  });

  it('doubles a part adjacent to a Tuning Fork', () => {
    const plain = place(['coil', 3, 2]);
    const forked = place(['coil', 3, 2], ['fork', 3, 1]);
    expect(simulateDrop(plain, column(2), rules()).total).toBe(2);
    // coil becomes x4
    expect(simulateDrop(forked, column(2), rules()).total).toBe(4);
    expect(isForked(forked, cellAt(3, 2))).toBe(true);
    // a fork is never doubled by another fork
    expect(isForked(place(['fork', 3, 2], ['fork', 3, 1]), cellAt(3, 2))).toBe(false);
  });

  it('splits into a second marble that banks independently', () => {
    // prism at (2,2): original continues col 2, copy drops col 3 from row 3
    const b = place(['prism', 2, 2], ['weight', 4, 2], ['weight', 4, 3]);
    const r = simulateDrop(b, column(2), rules());
    // original: 1 +3 = 4. copy: 1 +3 = 4. total 8
    expect(r.total).toBe(8);
    expect(r.marbles).toBe(2);
    expect(r.events.some((e) => e.kind === 'split')).toBe(true);
  });

  it('bounces off a spring and re-triggers what is above', () => {
    // weight at row 1, spring at row 3. Marble hits weight (4), spring sends
    // it back to row 1, weight fires again (7), spring is spent, falls out.
    const b = place(['weight', 1, 2], ['spring', 3, 2]);
    const r = simulateDrop(b, column(2), rules());
    expect(r.total).toBe(7);
    expect(r.events.filter((e) => e.kind === 'bounce')).toHaveLength(1);
  });

  it('honours a variant that grants extra spring uses', () => {
    const b = place(['weight', 1, 2], ['spring', 3, 2]);
    // Perpetual Motion: the spring fires twice, so the weight fires three times
    expect(simulateDrop(b, column(2), rules({ springUses: 2 })).total).toBe(10);
  });

  it('confiscates a marble below the gate threshold and banks nothing', () => {
    const low = place(['gate', 3, 2]);
    const lowResult = simulateDrop(low, column(2), rules());
    expect(lowResult.total).toBe(0);
    expect(lowResult.events.some((e) => e.kind === 'confiscated')).toBe(true);
    expect(lowResult.events.some((e) => e.kind === 'banked')).toBe(false);

    // 1 + 3 + 3 + 3 = 10, which passes, then x3
    const high = place(['weight', 0, 2], ['weight', 1, 2], ['weight', 2, 2], ['gate', 3, 2]);
    expect(simulateDrop(high, column(2), rules()).total).toBe(30);
  });

  it('stacks resonators, second one at x3 not x1.5', () => {
    const one = place(['weight', 1, 2], ['weight', 2, 2], ['reso', 3, 2]);
    // (1+3+3) * 1.5 = 10.5, rounded to 11 as the original does
    expect(simulateDrop(one, column(2), rules()).total).toBe(11);

    const two = place(['weight', 1, 2], ['weight', 2, 2], ['reso', 3, 2], ['reso', 4, 2]);
    // 11 * 3 = 33
    expect(simulateDrop(two, column(2), rules()).total).toBe(33);
  });

  it('counts prior touches for copper wire', () => {
    const b = place(['weight', 1, 2], ['weight', 2, 2], ['wire', 3, 2]);
    // 1 +3 +3 = 7, then +2 for the two parts already touched
    expect(simulateDrop(b, column(2), rules()).total).toBe(9);
  });

  it('deflects left off an anvil', () => {
    const b = place(['anvil', 2, 2], ['weight', 4, 1]);
    // +8 then shunted to column 1, where the weight adds 3
    expect(simulateDrop(b, column(2), rules()).total).toBe(12);
  });

  it('spawns a bonus marble per echo bell, and the Power Cut jam silences them', () => {
    const b = place(['bell', 3, 4]);
    const on = simulateDrop(b, column(0), rules());
    expect(on.marbles).toBe(2);
    expect(on.total).toBe(2);

    const off = simulateDrop(b, column(0), rules({ jam: 'noBells' }));
    expect(off.marbles).toBe(1);
    expect(off.total).toBe(1);
  });

  it('skids past the first part under the Slippery jam', () => {
    const b = place(['weight', 1, 2], ['weight', 3, 2]);
    expect(simulateDrop(b, column(2), rules()).total).toBe(7);
    // first weight is skipped
    expect(simulateDrop(b, column(2), rules({ jam: 'slippery' })).total).toBe(4);
  });

  it('adds gravity per row fallen', () => {
    // six rows, +1 each
    expect(simulateDrop(EMPTY, column(0), rules({ gravity: true })).total).toBe(7);
  });

  it('applies the lead marbles base value', () => {
    expect(simulateDrop(EMPTY, column(0), rules({ baseValue: 2 })).total).toBe(2);
  });

  it('is deterministic: identical inputs always give an identical result', () => {
    const b = place(['weight', 1, 2], ['prism', 2, 2], ['coil', 3, 2], ['fork', 3, 1]);
    const a = simulateDrop(b, column(2), rules());
    const c = simulateDrop(b, column(2), rules());
    expect(c.total).toBe(a.total);
    expect(c.events).toEqual(a.events);
  });

  it('never loops forever on a spring that would cycle', () => {
    const b = place(['spring', 5, 2], ['spring', 3, 2], ['spring', 1, 2]);
    const r = simulateDrop(b, column(2), rules({ springUses: 99 }));
    expect(r.total).toBeGreaterThan(0);
    expect(r.events.length).toBeLessThan(500);
  });
});

/**
 * The renderer, the breakdown panel and any future replay verifier all read
 * the event log rather than the total. parity.test.ts compares totals only,
 * so a log that omitted events passed it — that is exactly how the breakdown
 * came to drop Gravity Well's +1 per row and misreport every line.
 */
describe('the event log explains the total on its own', () => {
  const boards: readonly Board[] = [
    place(['weight', 2, 2], ['coil', 4, 2]),
    place(['prism', 1, 2], ['weight', 3, 2], ['weight', 3, 3]),
    place(['spring', 4, 2], ['weight', 1, 2], ['reso', 5, 2]),
    place(['gate', 3, 2], ['weight', 1, 2]),
    place(['bell', 0, 0], ['bell', 0, 4], ['coil', 3, 2]),
    place(['fork', 2, 1], ['weight', 2, 2], ['anvil', 4, 2]),
  ];

  const rulesets: readonly Rules[] = [
    RULES,
    { ...RULES, gravity: true },
    { ...RULES, jam: 'slippery' },
    { ...RULES, springUses: 2, gravity: true },
  ];

  it('banks exactly the total, and every marble ends banked or seized', () => {
    for (const board of boards) {
      for (const rules of rulesets) {
        const r = simulateDrop(board, column(2), rules);
        const banked = r.events
          .filter((e) => e.kind === 'banked')
          .reduce((sum, e) => sum + (e.kind === 'banked' ? e.value : 0), 0);
        expect(banked).toBe(r.total);

        // Each marble that entered the board leaves it exactly once. A marble
        // that never resolves would hang in the overlay forever.
        const entered = new Set(r.events.filter((e) => e.kind === 'enter').map((e) => e.marble));
        const left = r.events.filter((e) => e.kind === 'banked' || e.kind === 'confiscated');
        expect(new Set(left.map((e) => e.marble))).toEqual(entered);
        expect(left).toHaveLength(entered.size);
      }
    }
  });

  it('records every value change, so the log reconstructs each final value', () => {
    for (const board of boards) {
      for (const rules of rulesets) {
        const r = simulateDrop(board, column(2), rules);
        // Replay the log the way the breakdown does, and check the value it
        // arrives at matches what the marble actually banked.
        const value = new Map<number, number>();
        for (const e of r.events) {
          if (e.kind === 'enter' && !value.has(e.marble)) value.set(e.marble, e.value);
          if (e.kind === 'gravity') value.set(e.marble, e.value);
          if (e.kind === 'trigger') value.set(e.marble, e.after);
          if (e.kind === 'banked') expect(value.get(e.marble)).toBe(e.value);
        }
      }
    }
  });

  it('emits one gravity event per cell entered, and none without the blueprint', () => {
    const board = place(['weight', 2, 2]);
    const on = simulateDrop(board, column(2), { ...RULES, gravity: true });
    const off = simulateDrop(board, column(2), RULES);
    expect(off.events.filter((e) => e.kind === 'gravity')).toHaveLength(0);
    expect(on.events.filter((e) => e.kind === 'gravity'))
      .toHaveLength(on.events.filter((e) => e.kind === 'enter').length);
    // Six rows of +1 on top of a base 1 that the weight then lifts by 3.
    expect(on.total).toBe(off.total + ROWS);
  });

  it('does not label a spring that had no bounce left', () => {
    // A spent spring used to emit '↑↑' with before === after, putting a
    // bounce in the breakdown that the marble's own value shows never
    // happened. It should still be reachable, just silent.
    const board = place(['spring', 4, 2]);
    const r = simulateDrop(board, column(2), RULES);
    const bounces = r.events.filter((e) => e.kind === 'bounce');
    const springLabels = r.events.filter((e) => e.kind === 'trigger' && e.label === '↑↑');
    expect(springLabels).toHaveLength(bounces.length);
  });
});
