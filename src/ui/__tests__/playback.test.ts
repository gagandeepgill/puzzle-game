/**
 * The scheduling that decides when each marble moves.
 *
 * These run against real logs from simulateDrop rather than hand-written
 * events, so a change to the log's shape breaks them instead of quietly
 * making the animation wrong.
 */
import { describe, expect, it } from 'vitest';
import { chunkByMarble, startFrames } from '../playback.js';
import { simulateDrop } from '../../game/simulate.js';
import { COLS, ROWS, cellAt, column } from '../../game/types.js';
import type { Board, PartKey, Rules } from '../../game/types.js';

const EMPTY: Board = Array(COLS * ROWS).fill(null);
const place = (...parts: readonly (readonly [PartKey, number, number])[]): Board => {
  const b = [...EMPTY];
  for (const [part, r, c] of parts) b[cellAt(r, c)] = part;
  return b;
};
const RULES: Rules = { baseValue: 1, springUses: 1, gravity: false, jam: null };

/** Frame -> marble ids that move on it. */
function schedule(board: Board, rules: Rules = RULES) {
  const events = simulateDrop(board, column(2), rules).events;
  const byMarble = chunkByMarble(events);
  const starts = startFrames(byMarble);
  const frames: number[][] = [];
  for (const [id, chunks] of byMarble) {
    const base = starts.get(id) ?? 0;
    for (let i = 0; i < chunks.length; i++) {
      (frames[base + i] ??= []).push(id);
    }
  }
  return { byMarble, starts, frames };
}

describe('chunkByMarble', () => {
  it('starts a new chunk at each cell the marble enters', () => {
    const { byMarble } = schedule(place(['weight', 2, 2]));
    const chunks = byMarble.get(0) ?? [];
    // Six rows entered, plus a final chunk for the bank.
    expect(chunks).toHaveLength(ROWS + 1);
    expect(chunks.every((c) => c.length > 0)).toBe(true);
    expect(chunks[0]?.[0]?.kind).toBe('enter');
    expect(chunks[chunks.length - 1]?.[0]?.kind).toBe('banked');
  });

  it('keeps everything that happened at a cell with that cell', () => {
    const { byMarble } = schedule(place(['weight', 2, 2]), { ...RULES, gravity: true });
    const chunks = byMarble.get(0) ?? [];
    const atWeight = chunks[2] ?? [];
    // enter, then gravity, then the weight firing — one frame, in order.
    expect(atWeight.map((e) => e.kind)).toEqual(['enter', 'gravity', 'trigger']);
  });

  it('loses no events', () => {
    const board = place(['prism', 1, 2], ['weight', 3, 2], ['coil', 4, 3]);
    const events = simulateDrop(board, column(2), RULES).events;
    const total = [...chunkByMarble(events).values()]
      .reduce((n, chunks) => n + chunks.reduce((m, c) => m + c.length, 0), 0);
    expect(total).toBe(events.length);
  });
});

describe('startFrames', () => {
  it('starts a prism copy one frame after the split, not after the parent lands', () => {
    // This is the whole point. Played in log order the copy waited for the
    // parent to reach the bottom and bank, which read as two unrelated drops.
    const { byMarble, starts, frames } = schedule(
      place(['prism', 1, 2], ['weight', 4, 2], ['weight', 4, 3]),
    );
    expect(byMarble.size).toBe(2);

    const splitFrame = (byMarble.get(0) ?? [])
      .findIndex((c) => c.some((e) => e.kind === 'split'));
    expect(splitFrame).toBeGreaterThanOrEqual(0);
    expect(starts.get(1)).toBe(splitFrame + 1);

    // The parent is still falling on the frame the copy appears.
    expect(frames[splitFrame + 1]).toEqual(expect.arrayContaining([0, 1]));
  });

  it('releases every Echo Bell marble on frame 0, together with the drop', () => {
    const { starts, frames } = schedule(place(['bell', 0, 0], ['bell', 0, 4]));
    expect([...starts.values()].every((f) => f === 0)).toBe(true);
    expect(frames[0]).toHaveLength(3);
  });

  it('gives a copy of a copy its own offset', () => {
    const { starts } = schedule(place(['prism', 0, 2], ['prism', 2, 3]));
    const offsets = [...starts.values()];
    expect(offsets.length).toBeGreaterThan(2);
    // Nested splits stagger rather than all starting together.
    expect(new Set(offsets).size).toBeGreaterThan(1);
  });

  it('never schedules a marble before the frame it was spawned on', () => {
    const boards = [
      place(['prism', 1, 2], ['weight', 3, 2]),
      place(['prism', 0, 2], ['prism', 2, 3], ['coil', 4, 2]),
      place(['bell', 0, 1], ['prism', 2, 2], ['spring', 4, 2]),
    ];
    for (const board of boards) {
      const { byMarble, starts } = schedule(board);
      for (const [, chunks] of byMarble) {
        for (const chunk of chunks) {
          for (const e of chunk) {
            if (e.kind !== 'split') continue;
            const parentStart = starts.get(e.marble) ?? 0;
            const childStart = starts.get(e.spawned) ?? 0;
            expect(childStart).toBeGreaterThan(parentStart);
          }
        }
      }
    }
  });
});
