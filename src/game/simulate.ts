/**
 * The drop simulation.
 *
 * Pure: no timers, no animation, no randomness. Given a board, a column and a
 * set of rules it returns the total banked plus an ordered log of everything
 * that happened. The renderer plays the log back at whatever speed it likes,
 * the breakdown UI reads it, and a replay verifier can re-derive it from the
 * same inputs.
 *
 * Determinism here is load-bearing. Resolution must never consume randomness,
 * or leaderboards, replays and shared seeds all break at once.
 */
import {
  COLS, ROWS, MARBLE_CAP, assertNever, cellAt, colOf, rowOf,
} from './types.js';
import type {
  Board, CellIndex, Column, DropEvent, DropResult, PartKey, Rules,
} from './types.js';

/** A marble in flight. Mutable inside the simulation only. */
interface Marble {
  id: number;
  value: number;
  col: number;
  row: number;
  /** Parts touched so far, which Copper Wire reads. */
  touched: number;
  /** Whether a Resonator has already fired for this marble. */
  resonated: boolean;
  /** Whether the Slippery jam has already eaten a trigger. */
  skidded: boolean;
  /** Springs used, keyed by cell, so multi-use variants work. */
  springs: Map<number, number>;
}

/** True when a Tuning Fork sits orthogonally adjacent, which doubles the
 *  part's effect. Forks never double each other and don't stack. */
export function isForked(board: Board, cell: CellIndex): boolean {
  const part = board[cell];
  if (!part || part === 'fork') return false;
  const r = rowOf(cell);
  const c = colOf(cell);
  const neighbours: readonly (readonly [number, number])[] =
    [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]];
  return neighbours.some(([rr, cc]) =>
    rr >= 0 && rr < ROWS && cc >= 0 && cc < COLS && board[cellAt(rr, cc)] === 'fork');
}

/**
 * Applies one part to a marble. Returns the label the UI should show, or
 * null when the marble is confiscated.
 *
 * Exhaustive over PartKey: adding a part without handling it here fails to
 * compile rather than silently doing nothing.
 */
function applyPart(
  part: PartKey, m: Marble, k: number, events: DropEvent[], cell: CellIndex,
): { label: string } | { confiscated: true } {
  const before = m.value;
  switch (part) {
    case 'weight':
      m.value += 3 * k;
      return { label: `+${3 * k}` };
    case 'anvil':
      m.value += 8 * k;
      if (m.col > 0) m.col -= 1;
      return { label: `+${8 * k} ⬅` };
    case 'coil':
      m.value *= 2 * k;
      return { label: `×${2 * k}` };
    case 'wire': {
      // touched already counts this part, so the bonus is the parts before it
      const add = (m.touched - 1) * k;
      m.value += add;
      return { label: `+${add}` };
    }
    case 'reso': {
      const mult = m.resonated ? 3 * k : 1.5 * k;
      m.value = Math.round(m.value * mult);
      m.resonated = true;
      return { label: `×${mult}` };
    }
    case 'gate':
      if (m.value >= 10) {
        m.value *= 3 * k;
        return { label: `×${3 * k}` };
      }
      events.push({ kind: 'confiscated', marble: m.id, cell, value: before });
      return { confiscated: true };
    case 'prism':
      // Splitting is handled by the caller, which owns the queue.
      return { label: 'SPLIT' };
    case 'spring':
      // Reached only once the spring is spent — a live one bounces in the
      // caller, which owns row position, and emits its own '↑↑' there.
      // Labelling this one would put a bounce in the breakdown that the
      // marble's value shows never happened.
      return { label: '' };
    case 'fork':
    case 'bell':
      // Passive. Fork doubles its neighbours; Bell spawns at drop start.
      return { label: '' };
    default:
      return assertNever(part);
  }
}

/**
 * Resolves a whole drop.
 *
 * @param board  the installed parts
 * @param col    the column the player released into
 * @param rules  base value, spring uses, gravity, and any active jam
 */
export function simulateDrop(board: Board, col: Column, rules: Rules): DropResult {
  const events: DropEvent[] = [];
  let nextId = 0;

  const makeMarble = (c: number, row: number, from?: Marble): Marble => ({
    id: nextId++,
    value: from ? from.value : rules.baseValue,
    col: c,
    row,
    touched: from ? from.touched : 0,
    resonated: from ? from.resonated : false,
    skidded: from ? from.skidded : false,
    springs: from ? new Map(from.springs) : new Map(),
  });

  const queue: Marble[] = [makeMarble(col, 0)];

  // Echo Bells release an extra marble down their own column, unless the
  // Power Cut jam has silenced them.
  if (rules.jam !== 'noBells') {
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[cellAt(r, c)] === 'bell' && queue.length < MARBLE_CAP) {
          queue.push(makeMarble(c, 0));
        }
      }
    }
  }

  const marbleCount = queue.length;
  let total = 0;

  while (queue.length > 0) {
    const m = queue.shift();
    if (!m) break;

    let confiscated = false;
    let steps = 0;
    while (m.row < ROWS && steps++ < 120) {
      const cell = cellAt(m.row, m.col);
      events.push({ kind: 'enter', marble: m.id, cell, value: m.value });

      if (rules.gravity) {
        m.value += 1;
        events.push({ kind: 'gravity', marble: m.id, cell, value: m.value });
      }

      const part = board[cell];
      if (part) {
        // Slippery: the first part a marble meets is skipped entirely, which
        // makes a junk part at the top of a column a deliberate shield.
        if (rules.jam === 'slippery' && !m.skidded) {
          m.skidded = true;
          events.push({ kind: 'skid', marble: m.id, cell });
          m.row += 1;
          continue;
        }

        const doubled = isForked(board, cell);
        const k = doubled ? 2 : 1;
        m.touched += 1;
        const before = m.value;

        // Spring bounces before the generic apply, because it changes row.
        if (part === 'spring') {
          const used = m.springs.get(cell) ?? 0;
          if (used < rules.springUses) {
            m.springs.set(cell, used + 1);
            const toRow = Math.max(0, m.row - 2 - (doubled ? 2 : 0));
            events.push({ kind: 'trigger', marble: m.id, cell, part, doubled,
              label: '↑↑', before, after: m.value });
            events.push({ kind: 'bounce', marble: m.id, cell, toRow });
            m.row = toRow;
            continue;
          }
        }

        const outcome = applyPart(part, m, k, events, cell);
        if ('confiscated' in outcome) {
          // Destroyed by a Gilded Gate. Banks nothing.
          confiscated = true;
          break;
        }

        if (outcome.label !== '') {
          events.push({ kind: 'trigger', marble: m.id, cell, part, doubled,
            label: outcome.label, before, after: m.value });
        }

        if (part === 'prism' && nextId < MARBLE_CAP) {
          const nc = m.col + 1 < COLS ? m.col + 1 : m.col - 1;
          const copy = makeMarble(nc, m.row + 1, m);
          queue.push(copy);
          events.push({ kind: 'split', marble: m.id, cell, spawned: copy.id });
        }
      }

      m.row += 1;
    }

    if (!confiscated) {
      total += m.value;
      events.push({ kind: 'banked', marble: m.id, value: m.value });
    }
  }

  return { total, events, marbles: Math.max(marbleCount, nextId) };
}
