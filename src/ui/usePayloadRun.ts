import { useCallback, useRef, useState } from 'react';
import {
  dropInto, dropsForRound, jamFor, quotaFor, reduce, startOptions, startRun,
} from '../game/run.js';
import type { Rng } from '../game/rng.js';
import type { Action, RunOptions } from '../game/run.js';
import { utcDateKey } from '../game/rng.js';
import { assertNever } from '../game/types.js';
import type {
  CellIndex, Column, DifficultyKey, DropEvent, DropResult, Mode, RunState,
} from '../game/types.js';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** A marble as the board draws it. The simulation's own Marble type stays
 *  private to src/game; this is only what the overlay needs. */
export interface MarbleView {
  readonly id: number;
  readonly cell: CellIndex;
  readonly value: number;
}

/** A number that floats off a cell and fades. Carries what a part did, which
 *  the flash alone cannot: `+3` and `×2` look identical without it. */
export interface FloatLabel {
  readonly id: number;
  readonly cell: CellIndex;
  readonly text: string;
  /** A Tailwind text colour class. */
  readonly tone: string;
}

export interface Playback {
  /** Cell currently firing, for the flash. */
  readonly firingCell: CellIndex | null;
  /** Bumped on every flash so a Spring re-triggering the same cell restarts
   *  the animation, which a class toggle alone cannot do. */
  readonly firingSeq: number;
  /** Running total during playback, so the HUD ticks up. */
  readonly tick: number;
  /** Non-null only while a drop is resolving, so the ticker can hide between
   *  drops instead of showing a stale zero. */
  readonly ticking: boolean;
  readonly marbles: readonly MarbleView[];
  readonly labels: readonly FloatLabel[];
  /** Human-readable trace of the last drop, which persists after it ends. */
  readonly breakdown: readonly string[];
  /** Written once per drop, after it resolves, with final figures. Kept
   *  separate from `tick` so the live region never announces a partial total
   *  against stale round state. */
  readonly announcement: string;
}

/**
 * Owns run state and animation playback.
 *
 * The engine decides what happened; this decides how fast to show it. That
 * split is what lets the skip control collapse the timing without touching
 * the maths, and what will let a replay verifier re-derive a score server-side.
 */
const EMPTY_PLAYBACK: Playback = {
  firingCell: null, firingSeq: 0, tick: 0, ticking: false,
  marbles: [], labels: [], breakdown: [], announcement: '',
};

/** Colour by what the label means, not by which part produced it. */
function toneFor(text: string): string {
  if (text.startsWith('×')) return 'text-brass';
  if (text.startsWith('+')) return 'text-ok';
  if (text === 'SPLIT' || text === '↑↑') return 'text-glow';
  return 'text-bad';
}

export function usePayloadRun(initial: { mode: Mode; difficulty: DifficultyKey }) {
  const optsRef = useRef<RunOptions>({ ...initial, dateKey: utcDateKey() });
  // startRun calls Math.random in free play, so it must not run during render.
  // Seeding once in a lazy initialiser and again only in restart keeps render
  // pure and stops StrictMode's double invoke from re-rolling the board.
  const rngRef = useRef<Rng>(() => 0);
  const [state, setState] = useState<RunState>(() => {
    const seeded = startRun(startOptions(optsRef.current));
    rngRef.current = seeded.rng;
    return seeded.state;
  });
  const [playback, setPlayback] = useState<Playback>(EMPTY_PLAYBACK);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const skipRef = useRef(false);
  /** Bumped by every restart. A drop captures it and abandons itself the
   *  moment it no longer matches, because `drop` awaits between events and
   *  `dispatch` resolves against whatever run is current when it lands —
   *  otherwise switching difficulty mid-animation banks the abandoned run's
   *  score into the new one. */
  const runIdRef = useRef(0);

  const dispatch = useCallback((action: Action) => {
    setState((s) => reduce(s, action, rngRef.current));
  }, []);

  /**
   * Restarting always re-seeds, even with identical options. The previous
   * version compared a derived key, so "Play again" on the same mode, day and
   * difficulty produced no state change at all and the modal stayed up.
   */
  const restart = useCallback((next: Partial<RunOptions> = {}) => {
    const opts: RunOptions = { ...optsRef.current, ...next };
    optsRef.current = opts;
    runIdRef.current += 1;
    const seeded = startRun(startOptions(opts));
    rngRef.current = seeded.rng;
    setState(seeded.state);
    setPlayback(EMPTY_PLAYBACK);
    busyRef.current = false;
    setBusy(false);
  }, []);

  const skip = useCallback(() => { skipRef.current = true; }, []);

  /**
   * Turns the engine's event log into a line a player can re-read after the
   * animation is gone. Showing the running value after each step is the point:
   * without it the arithmetic can't be reconstructed, which is the complaint
   * the whole breakdown exists to answer.
   *
   *   3 → +3 → 6 → ×2 → 12
   */
  const traceFrom = (events: readonly DropEvent[]): string[] => {
    const lines: string[] = [];
    const open = new Map<number, string[]>();

    for (const e of events) {
      if (e.kind === 'enter' && !open.has(e.marble)) {
        open.set(e.marble, [String(e.value)]);
      }
      // Gravity Well adds 1 per row before any part applies, so a trace that
      // skipped these events showed 1 + 3 arriving at 7. Every line was wrong
      // for anyone holding the blueprint.
      if (e.kind === 'gravity') {
        open.get(e.marble)?.push('+1', String(e.value));
      }
      if (e.kind === 'trigger' && e.label) {
        open.get(e.marble)?.push(e.label, String(e.after));
      }
      if (e.kind === 'confiscated') {
        const parts = open.get(e.marble);
        if (parts) {
          parts.push('confiscated (0)');
          lines.push(parts.join(' → '));
          open.delete(e.marble);
        }
      }
      if (e.kind === 'banked') {
        const parts = open.get(e.marble);
        if (parts) {
          // Drop the final value if the last trigger already produced it.
          if (parts[parts.length - 1] !== String(e.value)) parts.push(String(e.value));
          lines.push(parts.join(' → '));
          open.delete(e.marble);
        }
      }
    }
    return lines;
  };

  const drop = useCallback(async (col: Column) => {
    if (busyRef.current || state.phase.kind !== 'playing' || state.dropsLeft <= 0) return;
    busyRef.current = true;
    setBusy(true);
    skipRef.current = false;
    const myRun = runIdRef.current;
    const abandoned = () => runIdRef.current !== myRun;

    const result: DropResult = dropInto(state, col);
    const instant = prefersReducedMotion();
    let running = 0;
    let seq = 0;

    // Marbles in flight, and the labels floating off cells. Both are held
    // outside React state and republished as fresh arrays, so a marble keeps
    // its key across steps and can transition between cells.
    const live = new Map<number, MarbleView>();
    let labels: FloatLabel[] = [];
    let labelId = 0;
    let firingCell: CellIndex | null = null;

    // Animating and not animating are the same loop; only the sleeps differ.
    // A drop the player skipped, or one under prefers-reduced-motion, drops
    // the overlay entirely rather than flashing every label at once — the
    // breakdown panel and the live region carry the same information.
    const paint = async (ms: number) => {
      if (abandoned() || instant || skipRef.current) return;
      const marbles = [...live.values()];
      const shown = labels.slice(-8);   // bound the DOM; older ones have faded
      const at = firingCell;
      const n = seq;
      setPlayback((p) => ({
        ...p, firingCell: at, firingSeq: n, marbles, labels: shown,
        tick: running, ticking: true,
      }));
      await sleep(ms);
    };

    const float = (cell: CellIndex, text: string) => {
      labels = [...labels, { id: labelId++, cell, text, tone: toneFor(text) }];
    };

    for (const event of result.events) {
      if (abandoned()) return;
      switch (event.kind) {
        case 'enter':
          live.set(event.marble, { id: event.marble, cell: event.cell, value: event.value });
          firingCell = null;
          await paint(60);
          break;

        case 'gravity':
          live.set(event.marble, { id: event.marble, cell: event.cell, value: event.value });
          await paint(0);
          break;

        case 'trigger': {
          const m = live.get(event.marble);
          if (m) live.set(event.marble, { ...m, value: event.after });
          if (event.label) float(event.cell, event.label);
          seq += 1;
          firingCell = event.cell;
          await paint(130);   // one part at a time, paced for comprehension
          break;
        }

        case 'skid':
          float(event.cell, 'skid!');
          await paint(90);
          break;

        case 'split':
          float(event.cell, 'SPLIT');
          await paint(90);
          break;

        case 'confiscated':
          float(event.cell, 'seized');
          live.delete(event.marble);
          await paint(200);
          break;

        case 'banked': {
          const m = live.get(event.marble);
          if (m) float(m.cell, `+${event.value}`);
          live.delete(event.marble);
          running += event.value;
          await paint(140);
          break;
        }

        case 'bounce':
          // The row change shows up in the next `enter`, which moves the
          // marble; there is nothing extra to draw here.
          break;

        default:
          assertNever(event);
      }
    }

    // A restart landed while this drop was animating, so its score belongs to
    // a run that no longer exists. Drop it on the floor; restart already
    // cleared busy and playback.
    if (abandoned()) return;

    // Figures for the announcement come from before the reducer runs, because
    // clearing a quota resets roundScore and would make the sentence wrong.
    const quotaNow = quotaFor(state, state.round);
    const roundAfter = state.roundScore + result.total;
    const dropsAfter = state.dropsLeft - 1;
    setPlayback({
      firingCell: null,
      firingSeq: seq,
      tick: result.total,
      ticking: false,
      marbles: [],
      labels: [],
      breakdown: traceFrom(result.events),
      announcement:
        `Drop scored ${result.total}. Round score ${roundAfter} of ${quotaNow}. ` +
        `${dropsAfter} drop${dropsAfter === 1 ? '' : 's'} left.`,
    });
    dispatch({ type: 'applyDrop', result });
    busyRef.current = false;
    setBusy(false);
    skipRef.current = false;
  }, [state, dispatch]);

  return {
    state,
    playback,
    busy,
    dispatch,
    drop,
    skip,
    restart,
    quota: quotaFor(state, state.round),
    jam: jamFor(state, state.round),
    dropsThisRound: dropsForRound(state, state.round),
    reducedMotion: prefersReducedMotion(),
  };
}
