import { useCallback, useMemo, useRef, useState } from 'react';
import {
  dropInto, dropsForRound, jamFor, quotaFor, reduce, startRun,
} from '../game/run.js';
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
  /** Running total during playback, so the HUD ticks up. */
  readonly tick: number;
  /** Human-readable trace of the last drop, which persists after it ends. */
  readonly breakdown: readonly string[];
}

/**
 * Owns run state and animation playback.
 *
 * The engine decides what happened; this decides how fast to show it. That
 * split is what lets the skip control collapse the timing without touching
 * the maths, and what will let a replay verifier re-derive a score server-side.
 */
export function usePayloadRun(initial: StartOptions) {
  const [opts, setOpts] = useState<StartOptions>({
    ...initial,
    dateKey: initial.dateKey ?? utcDateKey(),
  });
  const seed = useMemo(() => startRun(opts), [opts]);
  const rngRef = useRef(seed.rng);
  const [state, setState] = useState<RunState>(seed.state);
  const [playback, setPlayback] = useState<Playback>({
    firingCell: null, tick: 0, breakdown: [],
  });
  const [busy, setBusy] = useState(false);
  const skipRef = useRef(false);

  // Restart when the options change identity.
  const optsKey = `${opts.mode}:${opts.difficulty}:${opts.dateKey ?? ''}`;
  const lastKey = useRef(optsKey);
  if (lastKey.current !== optsKey) {
    lastKey.current = optsKey;
    rngRef.current = seed.rng;
    setState(seed.state);
    setPlayback({ firingCell: null, tick: 0, breakdown: [] });
    setBusy(false);
  }

  const dispatch = useCallback((action: Action) => {
    setState((s) => reduce(s, action, rngRef.current));
  }, []);

  const restart = useCallback((next: Partial<StartOptions>) => {
    setOpts((o): StartOptions => ({
      mode: next.mode ?? o.mode,
      difficulty: next.difficulty ?? o.difficulty,
      // Keep the current day unless a caller names one; never write undefined
      // over it, which exactOptionalPropertyTypes correctly rejects.
      dateKey: next.dateKey ?? o.dateKey ?? utcDateKey(),
    }));
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
        open.get(e.marble)?.push('confiscated');
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
    if (busy || state.phase.kind !== 'playing' || state.dropsLeft <= 0) return;
    setBusy(true);
    skipRef.current = false;

    const result: DropResult = dropInto(state, col);
    const instant = prefersReducedMotion();
    let running = 0;

    for (const event of result.events) {
      if (!instant && !skipRef.current) {
        if (event.kind === 'enter') {
          setPlayback((p) => ({ ...p, firingCell: event.cell }));
          await sleep(90);
        } else if (event.kind === 'trigger') {
          await sleep(130);   // one part at a time, paced for comprehension
        }
      }
      if (event.kind === 'banked') {
        running += event.value;
        setPlayback((p) => ({ ...p, tick: running }));
      }
    }

    setPlayback({ firingCell: null, tick: result.total, breakdown: traceFrom(result.events) });
    dispatch({ type: 'applyDrop', result });
    setBusy(false);
    skipRef.current = false;
  }, [busy, state, dispatch]);

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
  };
}
