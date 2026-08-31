import { useCallback, useEffect, useRef, useState } from 'react';
import {
  dropInto, dropsForRound, jamFor, quotaFor, reduce, startOptions, startRun,
} from '../game/run.js';
import type { Rng } from '../game/rng.js';
import type { Action, RunOptions } from '../game/run.js';
import { dayNumber, utcDateKey } from '../game/rng.js';
import { bumpStreak, recordFor, streakIsLive } from '../game/daily.js';
import type { DailyRecord, Streak } from '../game/daily.js';
import { loadRecord, loadStreak, saveRecord, saveStreak } from './store.js';
import { sfx } from './audio.js';
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
  // Options live in state, not only in a ref. The banner, the streak line and
  // the "locked in" lookup all read dateKey, and a ref cannot tell them it
  // changed — a session left open across UTC midnight kept showing yesterday's
  // day number against today's puzzle. The ref mirrors it so callbacks can read
  // the current value synchronously without taking it as a dependency.
  const [opts, setOpts] = useState<RunOptions>(() => ({ ...initial, dateKey: utcDateKey() }));
  const optsRef = useRef<RunOptions>(opts);
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
    if (action.type === 'placeSelected' || action.type === 'movePart') sfx.place();
    if (action.type === 'takeBlueprint') sfx.blueprint();
    setState((s) => reduce(s, action, rngRef.current));
  }, []);

  /**
   * Restarting always re-seeds, even with identical options. The previous
   * version compared a derived key, so "Play again" on the same mode, day and
   * difficulty produced no state change at all and the modal stayed up.
   */
  const restart = useCallback((next: Partial<RunOptions> = {}) => {
    // Re-read the date rather than reusing the one this session started with.
    // A run already in progress keeps its day — changing the seed underneath
    // someone mid-run would be worse — but a new run gets today's.
    const fresh: RunOptions = { ...optsRef.current, dateKey: utcDateKey(), ...next };
    optsRef.current = fresh;
    setOpts(fresh);
    runIdRef.current += 1;
    const seeded = startRun(startOptions(fresh));
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
    let triggers = 0;

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
          triggers += 1;
          sfx.trigger(triggers);
          seq += 1;
          firingCell = event.cell;
          await paint(130);   // one part at a time, paced for comprehension
          break;
        }

        case 'skid':
          sfx.skid();
          float(event.cell, 'skid!');
          await paint(90);
          break;

        case 'split':
          sfx.split();
          float(event.cell, 'SPLIT');
          await paint(90);
          break;

        case 'confiscated':
          sfx.seized();
          float(event.cell, 'seized');
          live.delete(event.marble);
          await paint(200);
          break;

        case 'banked': {
          const m = live.get(event.marble);
          sfx.bank(event.value);
          if (m) float(m.cell, `+${event.value}`);
          live.delete(event.marble);
          running += event.value;
          await paint(140);
          break;
        }

        case 'bounce':
          sfx.spring();
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

  /**
   * Round and run transitions, which nothing else marks.
   *
   * Clearing a quota used to drop the player straight into the next draft
   * panel with no signal that anything had been achieved. `cleared` drives a
   * short banner; the arpeggio is its audible half.
   */
  const [cleared, setCleared] = useState(0);
  const prevRef = useRef({ round: state.round, over: false });

  useEffect(() => {
    const prev = prevRef.current;
    const over = state.phase.kind === 'runOver';
    if (state.round > prev.round) { sfx.roundWon(); setCleared(state.round); }
    if (over && !prev.over) {
      if (state.phase.kind === 'runOver' && state.phase.won) sfx.roundWon();
      else sfx.runLost();
    }
    prevRef.current = { round: state.round, over };
  }, [state.round, state.phase]);

  useEffect(() => {
    if (cleared === 0) return;
    const t = setTimeout(() => setCleared(0), 1100);
    return () => clearTimeout(t);
  }, [cleared]);

  /**
   * Persist a finished daily, once.
   *
   * Runs in an effect rather than inside `drop`, because the run can also end
   * from the reducer's win branch after the last quota clears. Keyed on the
   * phase so a re-render cannot write twice, and `recordFor` keeps the first
   * attempt even if this somehow runs again.
   */
  const [record, setRecord] = useState<DailyRecord | null>(null);
  /** Whether `record` came from the run just played, or from an earlier
   *  attempt at the same day. The dialog shows both sets of numbers, and on a
   *  replay they disagree, so it has to say which is which. */
  const [recordIsThisRun, setRecordIsThisRun] = useState(true);
  const [streak, setStreak] = useState<Streak>(() => loadStreak());

  useEffect(() => {
    if (state.phase.kind !== 'runOver') { setRecord(null); return; }
    if (state.mode !== 'daily') return;
    const { dateKey } = opts;

    const won = state.phase.won;
    const attempt: DailyRecord = {
      dateKey,
      difficulty: state.difficulty.key,
      won,
      rounds: won ? state.difficulty.rounds : state.round,
      of: state.difficulty.rounds,
      total: state.total,
      bestDrop: state.bestDrop,
    };
    // recordFor returns `attempt` itself when it accepted it, so reference
    // equality answers "did this run set the record" exactly, rather than by
    // comparing figures that could coincide.
    const kept = recordFor(loadRecord(state.difficulty.key), attempt);
    saveRecord(kept);
    setRecord(kept);
    setRecordIsThisRun(kept === attempt);

    // Only the attempt that produced the record moves the streak. A replay
    // returns the stored record, and bumpStreak is idempotent for the day.
    const next = bumpStreak(loadStreak(), dateKey, kept.won);
    saveStreak(next);
    setStreak(next);
  }, [opts, state.phase, state.mode, state.difficulty, state.round, state.total, state.bestDrop]);

  /**
   * Today's stored result, if the player already finished this daily.
   *
   * Loaded in an effect rather than a useMemo. loadRecord touches
   * localStorage, and a storage read during render is a side effect that
   * misbehaves the moment anything renders this component twice.
   */
  const [todaysRecord, setTodaysRecord] = useState<DailyRecord | null>(null);

  useEffect(() => {
    if (opts.mode !== 'daily') { setTodaysRecord(null); return; }
    const stored = loadRecord(state.difficulty.key);
    setTodaysRecord(stored && stored.dateKey === opts.dateKey ? stored : null);
  }, [opts, state.difficulty, record]);

  return {
    state,
    playback,
    busy,
    dispatch,
    drop,
    skip,
    restart,
    record,
    recordIsThisRun,
    todaysRecord,
    cleared,
    streak,
    streakLive: streakIsLive(streak, opts.dateKey),
    dateKey: opts.dateKey,
    day: dayNumber(opts.dateKey),
    quota: quotaFor(state, state.round),
    jam: jamFor(state, state.round),
    dropsThisRound: dropsForRound(state, state.round),
    reducedMotion: prefersReducedMotion(),
  };
}
