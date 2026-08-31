/**
 * Turning the drop log into animation frames.
 *
 * Pure and React-free on purpose, so the scheduling can be tested without a
 * renderer. simulateDrop resolves marbles one at a time because that is the
 * cheapest correct order; replaying them in that order made a prism split look
 * like two unrelated drops, so this regroups the log into frames where every
 * marble in flight advances one cell together.
 */
import type { DropEvent } from '../game/types.js';
/**
 * One cell visit for one marble: the `enter` plus everything that happened
 * before it moved on.
 *
 * `banked` is emitted after the marble has left the board and has no `enter`
 * of its own, so it becomes a final chunk — the beat where the marble drops
 * out of the bottom and pays.
 */
export type Chunk = readonly DropEvent[];

/** Splits the log per marble, preserving each marble's own event order. */
export function chunkByMarble(events: readonly DropEvent[]): Map<number, Chunk[]> {
  const out = new Map<number, DropEvent[][]>();
  for (const e of events) {
    let chunks = out.get(e.marble);
    if (!chunks) { chunks = []; out.set(e.marble, chunks); }
    const last = chunks[chunks.length - 1];
    if (!last || e.kind === 'enter' || e.kind === 'banked') chunks.push([e]);
    else last.push(e);
  }
  return out;
}

/**
 * The frame each marble starts moving on.
 *
 * Everything in the opening queue — the released marble plus any Echo Bell
 * spawns — starts together on frame 0. A prism copy starts one frame after
 * the split that created it, so it visibly leaves the prism rather than
 * appearing from nowhere.
 *
 * A copy is always created while its parent is being resolved, so its id is
 * always larger. Walking ids in ascending order therefore guarantees a
 * parent has its own start frame before any of its copies read it — without
 * depending on the log or the Map preserving processing order.
 */
export function startFrames(byMarble: Map<number, Chunk[]>): Map<number, number> {
  const start = new Map<number, number>();
  for (const id of byMarble.keys()) start.set(id, 0);
  for (const id of [...byMarble.keys()].sort((a, b) => a - b)) {
    const chunks = byMarble.get(id) ?? [];
    const base = start.get(id) ?? 0;
    chunks.forEach((chunk, i) => {
      for (const e of chunk) {
        if (e.kind === 'split') start.set(e.spawned, base + i + 1);
      }
    });
  }
  return start;
}
