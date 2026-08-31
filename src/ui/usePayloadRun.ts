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
import { chunkByMarble, startFrames } from './playback.js';
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

/** One drop, as the round log lists it. */
export interface LoggedDrop {
  /** 0-based, rendered 1-based. */
  readonly column: number;
  readonly total: number;
  /** Running round score after this drop, which is the number the quota is
   *  measured against and the reason the log is worth keeping. */
  readonly runningScore: number;
}

export interface Playback {
  /** Cells firing this frame. Plural because marbles now advance together,
   *  so a bell drop can trigger several parts at once. */
  readonly firingCells: readonly CellIndex[];
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
  firingCells: [], firingSeq: 0, tick: 0, ticking: false,
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
  // Kept in step every render, not only in restart. restart is the sole writer
  // today, so this is redundant — but a second writer added later would
  // silently desync the seed from the banner, and that is a nasty way to find
  // out. Mirroring state into a ref during render is safe; the ref is not read
  // during render.
  optsRef.current = opts;
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
    setRoundLog([]);
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
    let firingCells: CellIndex[] = [];

    // Animating and not animating are the same loop; only the sleeps differ.
    // A drop the player skipped, or one under prefers-reduced-motion, drops
    // the overlay entirely rather than flashing every label at once — the
    // breakdown panel and the live region carry the same information.
    const paint = async (ms: number) => {
      if (abandoned() || instant || skipRef.current) return;
      const marbles = [...live.values()];
      const shown = labels.slice(-8);   // bound the DOM; older ones have faded
      const at = firingCells;
      const n = seq;
      setPlayback((p) => ({
        ...p, firingCells: at, firingSeq: n, marbles, labels: shown,
        tick: running, ticking: true,
      }));
      await sleep(ms);
    };

    const float = (cell: CellIndex, text: string) => {
      labels = [...labels, { id: labelId++, cell, text, tone: toneFor(text) }];
    };

    const byMarble = chunkByMarble(result.events);
    const starts = startFrames(byMarble);
    const frames = Math.max(
      0,
      ...[...byMarble].map(([id, cs]) => (starts.get(id) ?? 0) + cs.length),
    );

    // One frame advances every marble that is in flight by one cell, rather
    // than running each marble to the bottom before starting the next. The
    // simulation resolves them one at a time because that is the cheapest
    // correct order; showing them that way made a prism split look like two
    // unrelated drops.
    for (let f = 0; f < frames; f++) {
      if (abandoned()) return;
      firingCells = [];
      let fired = 0;

      for (const [id, chunks] of byMarble) {
        const chunk = chunks[f - (starts.get(id) ?? 0)];
        if (!chunk) continue;

        for (const event of chunk) {
          switch (event.kind) {
            case 'enter':
            case 'gravity':
              live.set(event.marble, {
                id: event.marble, cell: event.cell, value: event.value,
              });
              break;

            case 'trigger': {
              const m = live.get(event.marble);
              if (m) live.set(event.marble, { ...m, value: event.after });
              if (event.label) float(event.cell, event.label);
              firingCells = [...firingCells, event.cell];
              triggers += 1;
              fired += 1;
              // Capped: eight marbles landing on parts in the same frame is a
              // burst of noise, not information.
              if (fired <= 2) sfx.trigger(triggers);
              seq += 1;
              break;
            }

            case 'skid':
              sfx.skid();
              float(event.cell, 'skid!');
              break;

            case 'split':
              sfx.split();
              float(event.cell, 'SPLIT');
              break;

            case 'confiscated':
              sfx.seized();
              float(event.cell, 'seized');
              live.delete(event.marble);
              break;

            case 'banked': {
              const m = live.get(event.marble);
              sfx.bank(event.value);
              if (m) float(m.cell, `+${event.value}`);
              live.delete(event.marble);
              running += event.value;
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
      }

      // A frame where something fired holds longer, so the part that scored is
      // readable before the next one does.
      await paint(fired > 0 ? 130 : 60);
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
      firingCells: [],
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
    setRoundLog((log) => [...log, { column: col, total: result.total, runningScore: roundAfter }]);
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
  /**
   * The drops taken so far this round.
   *
   * The breakdown panel only ever shows the last drop, so the shape of a round
   * — a weak opener, then the same machine paying more as parts compound — was
   * invisible. That curve is the thing an engine-builder is about.
   */
  const [roundLog, setRoundLog] = useState<readonly LoggedDrop[]>([]);
  const prevRef = useRef({ round: state.round, over: false });

  useEffect(() => {
    const prev = prevRef.current;
    const over = state.phase.kind === 'runOver';
    // A new round is a new machine to read, so the log starts empty. This runs
    // after the drop that cleared the quota has already appended to it.
    if (state.round > prev.round) { sfx.roundWon(); setCleared(state.round); setRoundLog([]); }
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
    roundLog,
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
