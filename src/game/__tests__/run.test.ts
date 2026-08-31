import { describe, expect, it } from 'vitest';
import {
  dropInto, dropsForRound, quotaFor, reduce, rollOffers, rulesFor, startRun,
} from '../run.js';
import { SCALER_KEYS } from '../content.js';
import { cellAt, column } from '../types.js';
import type { PartKey, RunState } from '../types.js';

/** Deterministic rng so these tests never flake. */
function seq(values: readonly number[]): () => number {
  let i = 0;
  return () => values[i++ % values.length] ?? 0.5;
}

const start = (over: Partial<Parameters<typeof startRun>[0]> = {}) =>
  startRun({ mode: 'free', difficulty: 'easy', rng: seq([0.1, 0.6, 0.3, 0.8]), ...over });

describe('startRun', () => {
  it('installs the difficulty starting board', () => {
    const { state } = start();
    expect(state.board[cellAt(2, 2)]).toBe('weight');
    expect(state.board[cellAt(4, 2)]).toBe('weight');
    expect(state.board[cellAt(5, 2)]).toBe('coil');
    expect(state.dropsLeft).toBe(4);
  });

  it('gives Hard a colder start and a longer run than Easy', () => {
    const easy = start({ difficulty: 'easy' }).state;
    const hard = start({ difficulty: 'hard' }).state;
    expect(easy.difficulty.rounds).toBe(4);
    expect(hard.difficulty.rounds).toBe(8);
    expect(hard.board.filter(Boolean)).toHaveLength(2);
    expect(easy.board.filter(Boolean)).toHaveLength(3);
    // no shared quota, so Easy is not Hard truncated
    expect(easy.difficulty.quotas.slice(0, 4)).not.toEqual(hard.difficulty.quotas.slice(0, 4));
  });

  it('is reproducible for a given day and difficulty, and salted between them', () => {
    const a = startRun({ mode: 'daily', difficulty: 'easy', dateKey: '2026-09-01' }).state;
    const b = startRun({ mode: 'daily', difficulty: 'easy', dateKey: '2026-09-01' }).state;
    const hard = startRun({ mode: 'daily', difficulty: 'hard', dateKey: '2026-09-01' }).state;
    const offersOf = (s: RunState) => s.phase.kind === 'drafting' ? s.phase.offers : [];
    expect(offersOf(b)).toEqual(offersOf(a));
    expect(offersOf(hard)).not.toEqual(offersOf(a));
  });

  it('applies the daily variant to quotas', () => {
    const s = startRun({ mode: 'daily', difficulty: 'easy', dateKey: '2026-08-31' }).state;
    // day 1 is Heavyworks: x1.5 quotas, base value 3
    expect(s.variant?.name).toBe('Heavyworks');
    expect(quotaFor(s, 0)).toBe(18);
    expect(rulesFor(s).baseValue).toBe(3);
  });
});

describe('drafting', () => {
  it('always offers at least one scaling part', () => {
    // A pool with a single scaler, and an rng that would never pick it.
    const pool: readonly PartKey[] = ['weight', 'weight', 'wire', 'anvil', 'coil'];
    for (let i = 0; i < 50; i++) {
      const offers = rollOffers(pool, seq([0.9, 0.1, 0.5, 0.2, 0.7]));
      expect(offers.some((p) => SCALER_KEYS.includes(p))).toBe(true);
    }
  });

  it('places the selected part and moves to playing', () => {
    const { state, rng } = start();
    const selected = reduce(state, { type: 'selectOffer', index: 0 }, rng);
    const target = cellAt(0, 0);
    const placed = reduce(selected, { type: 'placeSelected', cell: target }, rng);
    expect(placed.board[target]).not.toBeNull();
    expect(placed.phase.kind).toBe('playing');
  });

  it('refuses to place onto an occupied cell', () => {
    const { state, rng } = start();
    const selected = reduce(state, { type: 'selectOffer', index: 0 }, rng);
    const occupied = cellAt(2, 2);
    expect(reduce(selected, { type: 'placeSelected', cell: occupied }, rng)).toBe(selected);
  });
});

describe('round flow', () => {
  it('advances a round when the quota is met and resets the round score', () => {
    const { state, rng } = start();
    const playing = reduce(state, { type: 'skipDraft' }, rng);
    const big = { total: 999, events: [], marbles: 1 };
    const next = reduce(playing, { type: 'applyDrop', result: big }, rng);
    expect(next.round).toBe(1);
    expect(next.roundScore).toBe(0);
    expect(next.total).toBe(999);
    expect(next.bestDrop).toBe(999);
  });

  it('ends the run when drops run out below quota', () => {
    const { state, rng } = start();
    let s = reduce(state, { type: 'skipDraft' }, rng);
    for (let i = 0; i < 4; i++) {
      s = reduce(s, { type: 'applyDrop', result: { total: 1, events: [], marbles: 1 } }, rng);
    }
    expect(s.phase).toEqual({ kind: 'runOver', won: false });
  });

  it('wins after clearing the final round', () => {
    const { state, rng } = start();
    let s = state;
    for (let i = 0; i < 4; i++) {
      // Each round: resolve the draft, then any blueprint it hands off to.
      if (s.phase.kind === 'drafting') s = reduce(s, { type: 'skipDraft' }, rng);
      if (s.phase.kind === 'blueprint') {
        const key = s.phase.offers[0];
        if (key) s = reduce(s, { type: 'takeBlueprint', key }, rng);
      }
      s = reduce(s, { type: 'applyDrop', result: { total: 9999, events: [], marbles: 1 } }, rng);
    }
    expect(s.phase).toEqual({ kind: 'runOver', won: true });
  });

  it('runs the part draft first on a blueprint round, then the blueprint', () => {
    const { state, rng } = start();
    const clear = (s: RunState) =>
      reduce(s, { type: 'applyDrop', result: { total: 9999, events: [], marbles: 1 } }, rng);

    // Easy owes a blueprint after round index 1.
    const r1 = reduce(clear(reduce(state, { type: 'skipDraft' }, rng)), { type: 'skipDraft' }, rng);
    const afterR1 = clear(r1);

    // Round 2 opens with a part draft, not the blueprint.
    expect(afterR1.phase.kind).toBe('drafting');
    expect(afterR1.pendingBlueprint).toBe(true);

    // Resolving that draft hands off to the blueprint.
    const afterDraft = reduce(afterR1, { type: 'skipDraft' }, rng);
    expect(afterDraft.phase.kind).toBe('blueprint');
    expect(afterDraft.pendingBlueprint).toBe(false);

    // And taking one returns to play.
    if (afterDraft.phase.kind !== 'blueprint') throw new Error('expected blueprint');
    const key = afterDraft.phase.offers[0];
    if (!key) throw new Error('expected an offer');
    expect(reduce(afterDraft, { type: 'takeBlueprint', key }, rng).phase.kind).toBe('playing');
  });

  it('never skips a part draft, so Easy gets one every round', () => {
    const { state, rng } = start();
    let s = state;
    let drafts = 0;
    for (let round = 0; round < 4; round++) {
      if (s.phase.kind !== 'drafting') throw new Error(`round ${round} did not open with a draft`);
      drafts++;
      s = reduce(s, { type: 'skipDraft' }, rng);
      if (s.phase.kind === 'blueprint') {
        const key = s.phase.offers[0];
        if (!key) throw new Error('expected an offer');
        s = reduce(s, { type: 'takeBlueprint', key }, rng);
      }
      s = reduce(s, { type: 'applyDrop', result: { total: 9999, events: [], marbles: 1 } }, rng);
    }
    expect(drafts).toBe(4);
    expect(s.phase).toEqual({ kind: 'runOver', won: true });
  });

  it('refuses a blueprint that was not offered', () => {
    const { state, rng } = start();
    const s: RunState = { ...state, phase: { kind: 'blueprint', offers: ['lead'] } };
    expect(reduce(s, { type: 'takeBlueprint', key: 'gravity' }, rng)).toBe(s);
  });
});

describe('blueprints and jams', () => {
  it('overtime adds a drop immediately', () => {
    const { state, rng } = start();
    const before = state.dropsLeft;
    let s: RunState = { ...state, phase: { kind: 'blueprint', offers: ['overtime'] }, pendingBlueprint: false };
    s = reduce(s, { type: 'takeBlueprint', key: 'overtime' }, rng);
    expect(s.dropsLeft).toBe(before + 1);
  });

  it('short shift caps drops at 2 even with overtime', () => {
    const { state } = start({ difficulty: 'hard' });
    const withOvertime: RunState = { ...state, blueprints: new Set(['overtime'] as const) };
    // hard round index 2 is the Short Shift jam
    expect(dropsForRound(withOvertime, 0)).toBe(4);
    expect(dropsForRound(withOvertime, 2)).toBe(2);
  });

  it('loose screws relocates one part per round and refuses a second', () => {
    const { state, rng } = start();
    const s: RunState = { ...state, blueprints: new Set(['screws']), phase: { kind: 'playing' } };
    const moved = reduce(s, { type: 'movePart', from: cellAt(2, 2), to: cellAt(0, 0) }, rng);
    expect(moved.board[cellAt(0, 0)]).toBe('weight');
    expect(moved.board[cellAt(2, 2)]).toBeNull();
    expect(moved.screwUsed).toBe(true);
    const again = reduce(moved, { type: 'movePart', from: cellAt(4, 2), to: cellAt(0, 1) }, rng);
    expect(again).toBe(moved);
  });
});

describe('dropInto', () => {
  it('scores the starting Easy board through the loaded column', () => {
    const { state } = start();
    // weight, weight, coil down column 2: (1 + 3 + 3) * 2
    expect(dropInto(state, column(2)).total).toBe(14);
  });
});
