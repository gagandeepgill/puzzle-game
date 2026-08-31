import { useCallback, useRef, useState } from 'react';
import {
  dropInto, dropsForRound, jamFor, quotaFor, reduce, startRun,
} from '../game/run.js';
import type { Rng } from '../game/rng.js';
import type { Action, StartOptions } from '../game/run.js';
import { utcDateKey } from '../game/rng.js';
import type {
  CellIndex, Column, DropEvent, DropResult, RunState,
} from '../game/types.js';

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const prefersReducedMotion = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export interface Playback {
  /** Cell currently firing, for the flash. */
  readonly firingCell: CellIndex | null;
  /** Bumped on every flash so a Spring re-triggering the same cell restarts
   *  the animation, which a class toggle alone cannot do. */
  readonly firingSeq: number;
  /** Running total during playback, so the HUD ticks up. */
  readonly tick: number;
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
  firingCell: null, firingSeq: 0, tick: 0, breakdown: [], announcement: '',
};

export function usePayloadRun(initial: StartOptions) {
  const optsRef = useRef<StartOptions>({
    ...initial,
    dateKey: initial.dateKey ?? utcDateKey(),
  });
  // startRun calls Math.random in free play, so it must not run during render.
  // Seeding once in a lazy initialiser and again only in restart keeps render
  // pure and stops StrictMode's double invoke from re-rolling the board.
  const rngRef = useRef<Rng>(() => 0);
  const [state, setState] = useState<RunState>(() => {
    const seeded = startRun(optsRef.current);
    rngRef.current = seeded.rng;
    return seeded.state;
  });
  const [playback, setPlayback] = useState<Playback>(EMPTY_PLAYBACK);
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const skipRef = useRef(false);

  const dispatch = useCallback((action: Action) => {
    setState((s) => reduce(s, action, rngRef.current));
  }, []);

  /**
   * Restarting always re-seeds, even with identical options. The previous
   * version compared a derived key, so "Play again" on the same mode, day and
   * difficulty produced no state change at all and the modal stayed up.
   */
  const restart = useCallback((next: Partial<StartOptions> = {}) => {
    const opts: StartOptions = {
      mode: next.mode ?? optsRef.current.mode,
      difficulty: next.difficulty ?? optsRef.current.difficulty,
      dateKey: next.dateKey ?? optsRef.current.dateKey ?? utcDateKey(),
    };
    optsRef.current = opts;
    const seeded = startRun(opts);
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

    const result: DropResult = dropInto(state, col);
    const instant = prefersReducedMotion();
    let running = 0;
    let seq = 0;

    for (const event of result.events) {
      if (!instant && !skipRef.current) {
        // Flash only on an actual trigger. Flashing every `enter` lit empty
        // cells the marble merely passed through.
        if (event.kind === 'trigger') {
          seq += 1;
          const at = event.cell;
          const n = seq;
          setPlayback((p) => ({ ...p, firingCell: at, firingSeq: n }));
          await sleep(130);   // one part at a time, paced for comprehension
        } else if (event.kind === 'enter') {
          await sleep(50);
        }
      }
      if (event.kind === 'banked') running += event.value;
    }

    // Figures for the announcement come from before the reducer runs, because
    // clearing a quota resets roundScore and would make the sentence wrong.
    const quotaNow = quotaFor(state, state.round);
    const roundAfter = state.roundScore + result.total;
    const dropsAfter = state.dropsLeft - 1;
    setPlayback({
      firingCell: null,
      firingSeq: seq,
      tick: result.total,
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
