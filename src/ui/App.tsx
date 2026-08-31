import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Board } from './Board.js';
import { ResultModal } from './ResultModal.js';
import { Compendium } from './Compendium.js';
import { Icon, UIIcon } from './icons.js';
import type { IconName } from './icons.js';
import { usePayloadRun } from './usePayloadRun.js';
import { isMuted, setMuted } from './audio.js';
import { isCockpit, watchCockpit } from './breakpoints.js';
import { PARTS, BLUEPRINTS } from '../game/content.js';
import { COLS, ROWS, cellAt, column } from '../game/types.js';
import {
  columnTotals, fallPath, forkReach, heatFor, placementScores,
} from '../game/preview.js';
import { rulesFor } from '../game/run.js';
import type { CellIndex, DifficultyKey, Mode } from '../game/types.js';

/**
 * The material vocabulary, named once.
 *
 * Every surface in the app is one of these three, and the reason they are
 * constants rather than 40 copied class lists is that the last pass proved how
 * that ends: the board got a lit, bevelled treatment and everything around it
 * stayed a flat rectangle, because nothing named the treatment so nothing else
 * inherited it.
 *
 * `PANEL` is a housing, `RAISED` is anything you can press, and pressing one
 * swaps its bevel for `shadow-sunk` so the light stops reaching its top edge.
 * That is the whole trick: one light, top-left, and depth is which way the
 * bevel runs.
 */
const PANEL = 'bg-panel-lit border border-edge rounded-xl shadow-panel';
const PRESSABLE = [
  'transition-[background-color,border-color,color,box-shadow] duration-150',
  'active:shadow-sunk active:translate-y-px',
].join(' ');
const RAISED = `bg-raised border border-edge shadow-raised hover:border-steel ${PRESSABLE}`;

export function App() {
  const run = usePayloadRun({ mode: 'daily', difficulty: 'easy' });
  const { state, playback, busy } = run;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [modalDismissed, setModalDismissed] = useState(false);
  /** null = not moving; a cell = that part is picked up and awaiting a target. */
  const [moveFrom, setMoveFrom] = useState<CellIndex | null>(null);
  const [moving, setMoving] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);
  const [mute, setMute] = useState(() => isMuted());
  /**
   * The parts reference is the highest-value thing to promote on a wide
   * screen: the board draws each part as a glyph and a badge, and until now
   * the only way to learn what one did mid-run was to scroll past the board
   * and open a disclosure. It stays collapsed on a phone, where the vertical
   * budget is the constraint.
   */
  const [refOpen, setRefOpen] = useState(isCockpit);
  /**
   * Set once the player opens or closes the panel themselves, after which the
   * viewport stops having an opinion. Without it, widening a window would
   * reopen a panel somebody had just deliberately collapsed, which is the
   * layout overruling a decision rather than making one.
   */
  const refTouched = useRef(false);
  /** Column whose fall path is being previewed, from hover or keyboard focus. */
  const [peekColumn, setPeekColumn] = useState<number | null>(null);

  const drafting = state.phase.kind === 'drafting';
  const placeable = drafting && state.phase.selected !== null;
  const selectedPart = state.phase.kind === 'drafting' && state.phase.selected !== null
    ? state.phase.offers[state.phase.selected] ?? null
    : null;

  const rules = useMemo(() => rulesFor(state), [state]);

  /**
   * What each placement would be worth, from the same simulation the drop
   * runs. Up to 150 simulations, so it is memoised on the board and the card
   * rather than recomputed per render — but it is cheap enough to do
   * synchronously when either changes.
   */
  const heat = useMemo(() => {
    if (!selectedPart) return new Map();
    return heatFor(placementScores(state.board, selectedPart, rules));
  }, [state.board, selectedPart, rules]);

  /** Cells an existing Tuning Fork already reaches, so the doubling is visible
   *  before committing rather than discovered afterwards. */
  const reach = useMemo(
    () => (selectedPart ? forkReach(state.board, selectedPart) : new Set<CellIndex>()),
    [state.board, selectedPart],
  );

  const totals = useMemo(
    () => (state.phase.kind === 'playing' ? columnTotals(state.board, rules) : []),
    [state.board, rules, state.phase.kind],
  );

  const path = useMemo(
    () => (peekColumn === null ? [] : fallPath(state.board, column(peekColumn), rules)),
    [state.board, peekColumn, rules],
  );
  const canMove = state.blueprints.has('screws') && !state.screwUsed
    && state.phase.kind === 'playing';

  /** Which cells the board should light up while a move is in progress:
   *  every occupied cell until one is picked up, every empty cell after. */
  const movable = useMemo(() => {
    const set = new Set<CellIndex>();
    if (!moving) return set;
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const i = cellAt(r, c);
        const occupied = state.board[i] != null;
        if (moveFrom === null ? occupied : !occupied) set.add(i);
      }
    }
    return set;
  }, [moving, moveFrom, state.board]);

  // A move cannot outlive the state that allowed it. Without this, taking the
  // last drop of a round while a part is picked up leaves the board glowing
  // and the next round's first tap tries to complete a move that is gone.
  useEffect(() => {
    if (!canMove) { setMoving(false); setMoveFrom(null); }
  }, [canMove]);

  // dispatch is stable, but `moving`/`moveFrom` are not, so this handler is
  // rebuilt when they change. Cell is memoised against that.
  const dispatchRef = useRef(run.dispatch);
  dispatchRef.current = run.dispatch;
  // Read through a ref so the board is not a dependency of the handler, which
  // would rebuild it on every placement and defeat Cell's memo.
  const boardRef = useRef(state.board);
  boardRef.current = state.board;

  const onCellPress = useCallback((cell: CellIndex) => {
    if (moving) {
      if (moveFrom === null) {
        // Only a cell with something in it can be picked up.
        if (boardRef.current[cell] != null) setMoveFrom(cell);
        return;
      }
      // Tapping the part again puts it back down.
      if (cell === moveFrom) { setMoveFrom(null); return; }
      // The reducer refuses an occupied target, so clearing the move here
      // regardless would silently cancel it and make the player start over
      // with no idea why.
      if (boardRef.current[cell] != null) return;
      dispatchRef.current({ type: 'movePart', from: moveFrom, to: cell });
      setMoving(false);
      setMoveFrom(null);
      return;
    }
    dispatchRef.current({ type: 'placeSelected', cell });
  }, [moving, moveFrom]);

  const startOver = (over: Parameters<typeof run.restart>[0] = {}) => {
    setModalDismissed(false);
    setResetArmed(false);
    setMoving(false);
    setMoveFrom(null);
    run.restart(over);
  };

  const setMode = (mode: Mode) => startOver({ mode });
  const setDifficulty = (difficulty: DifficultyKey) => startOver({ difficulty });

  // Reading the query once at mount meant loading narrow and widening to the
  // cockpit left the panel collapsed with an empty rail beside it, and
  // rotating a tablet did the same. Empty deps: subscribe once, and read the
  // touched flag through a ref so a manual toggle does not resubscribe.
  // Empty deps: subscribe once. The rule about not overruling a manual
  // toggle lives in watchCockpit, where it can be tested — CDP viewport
  // emulation changes `matches` without firing `change`, so a browser check
  // of this path is not available.
  useEffect(() => watchCockpit(setRefOpen, () => refTouched.current), []);

  useEffect(() => {
    if (!resetArmed) return;
    const t = setTimeout(() => setResetArmed(false), 2500);
    return () => clearTimeout(t);
  }, [resetArmed]);

  return (
    // Safe-area padding matters only once installed, where there is no browser
    // chrome between the page and the notch or the home indicator.
    <main
      id="app-root"
      className="ck w-full mx-auto"
      style={{
        paddingLeft: 'max(10px, env(safe-area-inset-left))',
        paddingRight: 'max(10px, env(safe-area-inset-right))',
        paddingTop: 'max(14px, env(safe-area-inset-top))',
        paddingBottom: 'max(24px, env(safe-area-inset-bottom))',
      }}
    >
      <div className="ck-header flex flex-col gap-2.5">
      <header className="flex items-baseline justify-between gap-2">
        <h1 className="font-display font-bold text-head">
          Pay<span className="text-brass">load</span>
        </h1>
        <div className="flex items-center gap-1.5">
          {/* Two taps, because one stray press should not throw away a run.
              The armed state disarms itself after 2.5s. */}
          <button
            type="button"
            onClick={() => (resetArmed ? startOver() : setResetArmed(true))}
            className={`text-body font-semibold rounded-[9px] px-2.5 min-h-[34px] md:min-h-[36px] flex items-center gap-1.5 ${
              resetArmed
                ? `bg-raised border border-bad text-bad shadow-raised ${PRESSABLE}`
                : `text-steel hover:text-ink ${RAISED}`
            }`}
          >
            <UIIcon name="reset" size={15} />
            {resetArmed && 'Reset run?'}
            <span className="sr-only">{resetArmed ? '' : 'Reset the run'}</span>
          </button>
          <button
            type="button"
            aria-expanded={sheetOpen}
            aria-controls="settings-sheet"
            onClick={() => setSheetOpen((o) => !o)}
            className={`text-body font-semibold text-ink rounded-[9px] px-3 min-h-[34px] md:min-h-[36px] flex items-center gap-2 whitespace-nowrap ${RAISED}`}
          >
            {state.mode === 'daily' ? 'Daily' : 'Free'} · {state.difficulty.key === 'easy' ? 'Easy' : 'Hard'}
            <UIIcon name="sliders" size={15} className="text-steel" />
          </button>
        </div>
      </header>

      {sheetOpen && (
        <div id="settings-sheet" className={`${PANEL} p-2.5 flex flex-col gap-2`}>
          <div role="group" aria-label="Mode" className="flex flex-wrap gap-1.5">
            <Tab on={state.mode === 'daily'} onClick={() => setMode('daily')} icon="calendar">Daily</Tab>
            <Tab on={state.mode === 'free'} onClick={() => setMode('free')} icon="infinity">Free Play</Tab>
          </div>
          <div role="group" aria-label="Difficulty" className="flex flex-wrap gap-1.5">
            <Tab on={state.difficulty.key === 'easy'} onClick={() => setDifficulty('easy')} icon="sun">Easy · 4</Tab>
            <Tab on={state.difficulty.key === 'hard'} onClick={() => setDifficulty('hard')} icon="flame">Hard · 8</Tab>
          </div>
          <button
            type="button"
            aria-pressed={mute}
            onClick={() => { setMuted(!mute); setMute(!mute); }}
            className={`text-body font-semibold text-steel hover:text-ink rounded-[10px] py-2 min-h-[38px] flex items-center justify-center gap-2 ${RAISED}`}
          >
            <UIIcon name={mute ? 'soundOff' : 'soundOn'} size={15} />
            {mute ? 'Sound off' : 'Sound on'}
          </button>
          {/* The daily has no identity without its number, and free play had
              no copy at all — it looked like a daily that failed to load. */}
          {state.mode === 'daily' ? (
            <p className="text-meta text-steel">
              <b className="text-ink">
                Day #{run.day}
                {state.variant && ` — ${state.variant.name}`}
              </b>{' '}
              {state.variant?.desc} Everyone gets this same run today.
              {run.todaysRecord && (
                <>
                  {' '}<b className="text-brass">
                    Locked in: {run.todaysRecord.won ? 'cleared' : `stalled at round ${run.todaysRecord.rounds + 1}`},
                    banked {run.todaysRecord.total}.
                  </b>{' '}Replays won't change it.
                </>
              )}
              {run.streakLive && (
                <> <b className="text-glow inline-flex items-baseline gap-1">
                  <UIIcon name="streak" size={12} className="self-center" />
                  {run.streak.count}-day streak.
                </b></>
              )}
            </p>
          ) : (
            <p className="text-meta text-steel">
              <b className="text-ink">{state.difficulty.name}</b> — {state.difficulty.rounds} rounds.
              Unseeded: every run reshuffles.
            </p>
          )}
        </div>
      )}

      </div>

      <div className="ck-hud flex flex-col gap-2.5">
      <div className={`${PANEL} px-3 py-2 md:py-2.5`}>
        <div className="flex justify-between items-baseline gap-2 text-body text-steel tabular-nums">
          <span>Round <b className="font-display text-stat text-ink">{state.round + 1} / {state.difficulty.rounds}</b></span>
          <span>Quota <b className="font-display text-stat text-brass">{run.quota}</b></span>
        </div>
        {/* A channel cut into the panel with a lit fill sitting in it, rather
            than two flat bars. Same light as everything else, and it is the
            one element that is pure progress, so it earns the treatment. */}
        <div className="h-[6px] md:h-[8px] bg-ground rounded-full mt-1.5 md:mt-2 overflow-hidden shadow-sunk">
          <div
            className="h-full bg-gradient-to-r from-copper to-brass rounded-full transition-[width] duration-300 shadow-[inset_0_1px_0_rgba(255,255,255,.28)]"
            style={{ width: `${Math.min(100, (state.roundScore / run.quota) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between items-baseline gap-2 text-meta text-steel mt-1.5 md:mt-2 tabular-nums">
          <span>
            Score <b className="text-ink font-bold text-body">{state.roundScore}</b>
            {/* Climbs as each marble banks, so the round score is not a single
                jump from nowhere once the drop has already finished. */}
            {playback.ticking && (
              <b key={playback.tick} className="ml-1 inline-block text-ok font-bold animate-pop">
                +{playback.tick}
              </b>
            )}
          </span>
          <span>Drops left <b className="text-brass font-bold text-body">{state.dropsLeft}</b></span>
          <span>Banked <b className="text-ink font-bold text-body">{state.total}</b></span>
        </div>
        {run.jam && (
          <p className="mt-1.5 md:mt-2 text-meta font-bold text-bad flex items-start gap-1.5">
            <UIIcon name="alert" size={14} className="mt-px" />
            <span>JAM — {run.jam.name}: {run.jam.rule}</span>
          </p>
        )}

        {/* Blueprints are permanent and change the arithmetic, so they have to
            stay visible after their draft panel closes. Gravity Well in
            particular is otherwise invisible. */}
        {state.blueprints.size > 0 && (
          <ul aria-label="Blueprints in effect" className="flex flex-wrap gap-1 mt-1.5 md:mt-2 cockpit:flex-col">
            {[...state.blueprints].map((key) => (
              <li
                key={key}
                aria-label={`${BLUEPRINTS[key].name}. ${BLUEPRINTS[key].rule}`}
                className="text-micro font-semibold text-glow border border-glow/50 bg-glow/[0.07] rounded-full px-2 py-0.5 cockpit:rounded-lg cockpit:w-full cockpit:px-2.5 cockpit:py-1.5"
              >
                <Icon name={BLUEPRINTS[key].glyph as IconName} size={13} className="inline-block -mt-px mr-1 align-text-bottom" />
                {BLUEPRINTS[key].name}
                <span aria-hidden className="hidden cockpit:block text-micro font-normal text-steel leading-snug mt-0.5">
                  {BLUEPRINTS[key].rule}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Written once per drop, after it resolves. Deriving it from render-time
          state announced partial totals against a round that had already been
          reset by clearing the quota. */}
      <div className={`hidden cockpit:flex flex-col gap-2 ${PANEL} px-3 py-2.5`}>
        <h2 className="text-label font-bold uppercase tracking-[.08em] text-steel">
          {state.mode === 'daily' ? 'Today' : 'Free play'}
        </h2>
        {state.mode === 'daily' ? (
          <>
            <p className="text-body text-ink">
              <b className="font-display text-stat">Day #{run.day}</b>
              {state.variant && (
                <span className="block text-meta text-steel mt-1">
                  <Icon
                    name={state.variant.icon as IconName}
                    size={14}
                    className="inline-block mr-1 align-text-bottom text-brass"
                  />
                  <b className="text-ink">{state.variant.name}.</b> {state.variant.desc}
                </span>
              )}
            </p>
            {run.streakLive && (
              <p className="text-meta text-glow font-semibold flex items-center gap-1.5">
                <UIIcon name="streak" size={14} />
                {run.streak.count}-day streak
              </p>
            )}
            {run.todaysRecord && (
              <p className="text-meta text-steel">
                Locked in:{' '}
                {run.todaysRecord.won
                  ? 'cleared'
                  : `stalled at round ${run.todaysRecord.rounds + 1}`}
                , banked {run.todaysRecord.total}. Replays won't change it.
              </p>
            )}
          </>
        ) : (
          <p className="text-meta text-steel">
            <b className="text-ink">{state.difficulty.name}</b>, {state.difficulty.rounds} rounds.
            Unseeded: every run reshuffles.
          </p>
        )}
        <div role="group" aria-label="Difficulty" className="flex flex-wrap gap-1.5 pt-0.5">
          <Tab on={state.difficulty.key === 'easy'} onClick={() => setDifficulty('easy')} icon="sun">Easy</Tab>
          <Tab on={state.difficulty.key === 'hard'} onClick={() => setDifficulty('hard')} icon="flame">Hard</Tab>
        </div>
      </div>

      {run.roundLog.length > 0 && (
        <div className={`hidden cockpit:flex flex-col gap-1.5 ${PANEL} px-3 py-2.5`}>
          <h2 className="text-label font-bold uppercase tracking-[.08em] text-steel">
            This round
          </h2>
          <ol className="flex flex-col gap-1">
            {run.roundLog.map((d, i) => (
              <li
                key={i}
                className="flex items-baseline justify-between gap-2 text-meta tabular-nums"
              >
                <span className="text-steel">
                  Drop {i + 1}
                  <span className="text-steel/70"> · col {d.column + 1}</span>
                </span>
                <span className="whitespace-nowrap">
                  <b className="text-ok font-bold">+{d.total}</b>
                  <span className="text-steel/70"> → </span>
                  <b className="text-ink">{d.runningScore}</b>
                </span>
              </li>
            ))}
          </ol>
          {/* The gap left to close is the decision the next drop is about. */}
          <p className="text-meta text-steel border-t border-edge/40 pt-1.5">
            {state.roundScore >= run.quota
              ? 'Quota met.'
              : `${run.quota - state.roundScore} to go, ${state.dropsLeft} drop${state.dropsLeft === 1 ? '' : 's'} left.`}
          </p>
        </div>
      )}
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {playback.announcement}
      </p>

      <div className="ck-rail-a flex flex-col gap-2.5">
      {/* Compact on purpose. At the original sizes this panel ran 228px tall,
          which pushed the board 59% down a 375x812 phone and let it overflow
          by 70px — you could not see the machine you were drafting for. */}
      {drafting && (
        <div className="bg-panel-lit border border-brass rounded-[13px] shadow-panel p-2.5 flex flex-col gap-1.5 md:gap-2">
          <div className="flex justify-between items-center gap-2">
            <h2 className="font-display text-lead font-bold text-brass">Draft a part</h2>
            <button
              type="button"
              onClick={() => run.dispatch({ type: 'skipDraft' })}
              className={`text-body font-semibold text-steel hover:text-ink rounded-lg px-2.5 py-1 min-h-[32px] ${RAISED}`}
            >
              Skip
            </button>
          </div>
          {/* Wraps rather than overflowing. `flex-1` gave the cards a zero
              basis but left min-width:auto, so at a 200% browser font size
              the third card ran 21px outside the rail. A rem basis reflows
              the row to two-up and then one-up as text grows, which is what
              WCAG 1.4.10 asks for and what flex-1 could not do. */}
          <div className="flex flex-wrap gap-1.5">
            {state.phase.offers.map((key, i) => {
              const on = state.phase.kind === 'drafting' && state.phase.selected === i;
              return (
                <button
                  key={`${key}-${i}`}
                  type="button"
                  onClick={() => run.dispatch({ type: 'selectOffer', index: i })}
                  aria-pressed={on}
                  className={`grow basis-[6.5rem] min-w-0 rounded-[10px] px-1.5 py-1.5 md:py-2 flex flex-col items-center gap-0.5 md:gap-1 border-[1.5px] ${PRESSABLE} ${
                    on
                      // Selected reads as pressed into the panel, not merely
                      // tinted: the card you are holding should look held.
                      ? 'border-brass bg-brass/[0.12] shadow-sunk'
                      : 'border-edge bg-raised shadow-raised hover:border-brass/70'
                  }`}
                >
                  <Icon name={PARTS[key].glyph as IconName} size={24} className="text-ink/90" />
                  <span className="font-bold text-body leading-tight text-center">{PARTS[key].name}</span>
                  <span className="text-micro text-steel leading-[1.3] text-center">{PARTS[key].rule}</span>
                </button>
              );
            })}
          </div>
          <span className="text-meta text-steel">Pick a card, then tap an empty cell.</span>
        </div>
      )}

      {state.phase.kind === 'blueprint' && (
        <div className="bg-panel-lit border border-glow rounded-[13px] shadow-panel p-3 flex flex-col gap-2">
          <h2 className="font-display text-lead font-bold text-glow">A blueprint surfaces</h2>
          <div className="flex flex-wrap gap-2">
            {state.phase.offers.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => run.dispatch({ type: 'takeBlueprint', key })}
                className={`grow basis-[8rem] min-w-0 border-[1.5px] rounded-[11px] px-2 py-2.5 flex flex-col gap-1 hover:border-glow/70 ${RAISED}`}
              >
                <Icon name={BLUEPRINTS[key].glyph as IconName} size={26} className="text-glow" />
                <span className="font-bold text-body">{BLUEPRINTS[key].name}</span>
                <span className="text-meta text-steel">{BLUEPRINTS[key].rule}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* The drop row and the board share a width and an inset so each arrow
          sits over its own column. The board panel's own padding used to
          offset the grid by 8px, leaving the arrows subtly out of line.
          Capping the width is also what gets all six rows onto a phone. */}
      </div>

      <div
        className={`ck-board ck-machine flex flex-col gap-2 w-full mx-auto ${
          playback.shake === 3 ? 'animate-shake-3'
          : playback.shake === 2 ? 'animate-shake-2'
          : playback.shake === 1 ? 'animate-shake-1' : ''
        }`}
      >
      <div className="relative w-full flex flex-col gap-2">
        {/* 9px = the board panel's 8px padding plus its 1px border. */}
        <div className="grid grid-cols-5 gap-1.5 px-[9px]">
          {Array.from({ length: COLS }, (_, c) => {
            const total = totals[c];
            const best = total !== undefined && total > 0
              && total === Math.max(...totals.filter((t): t is number => t !== undefined));
            return (
              <button
                key={c}
                type="button"
                // The projection is in the name, not only the colour, so the
                // choice is available without seeing the board.
                aria-label={
                  total === undefined
                    ? `Drop a marble down column ${c + 1}`
                    : `Drop a marble down column ${c + 1}. Would bank ${total}${best ? ', the best column' : ''}`
                }
                disabled={state.phase.kind !== 'playing' || busy || state.dropsLeft <= 0}
                onClick={() => void run.drop(column(c))}
                onPointerEnter={() => setPeekColumn(c)}
                onPointerLeave={() => setPeekColumn((p) => (p === c ? null : p))}
                onFocus={() => setPeekColumn(c)}
                onBlur={() => setPeekColumn((p) => (p === c ? null : p))}
                className={`rounded-[9px] min-h-[44px] md:min-h-[46px] flex flex-col items-center justify-center leading-none ${PRESSABLE} bg-raised shadow-raised border disabled:opacity-35 disabled:cursor-not-allowed disabled:shadow-none disabled:active:translate-y-0 ${
                  best
                    ? 'border-brass text-brass enabled:hover:bg-brass/[0.12]'
                    : 'border-edge text-steel enabled:hover:border-steel enabled:hover:text-ink'
                }`}
              >
                <UIIcon name="drop" size={16} />
                {total !== undefined && (
                  <span aria-hidden className="text-micro font-bold tabular-nums mt-0.5">
                    {total}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <Board
          board={state.board}
          placeable={placeable}
          heat={heat}
          forkReach={reach}
          path={path}
          firingCells={playback.firingCells}
          firingSeq={playback.firingSeq}
          stepMs={playback.stepMs}
          marbles={playback.marbles}
          labels={playback.labels}
          movable={movable}
          onCellPress={onCellPress}
        />

        {/* Clearing a quota used to drop the player straight into the next
            draft with nothing marking that they had beaten anything. */}
        {run.cleared > 0 && (
          <p
            aria-hidden
            className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center font-display text-head font-bold text-brass animate-pop pointer-events-none drop-shadow-[0_2px_6px_rgba(0,0,0,.9)]"
          >
            QUOTA BEATEN
          </p>
        )}
      </div>

      {/* Loose Screws. Without this the blueprint is a permanent slot spent on
          a rule the player can never exercise. */}
      {canMove && (
        <button
          type="button"
          onClick={() => {
            if (moving) { setMoving(false); setMoveFrom(null); }
            else setMoving(true);
          }}
          className={`self-center text-body font-bold rounded-[10px] px-3 min-h-[36px] md:min-h-[38px] flex items-center gap-2 ${PRESSABLE} ${
            moving
              ? 'text-glow border border-glow bg-glow/[0.09] shadow-sunk'
              : `text-steel hover:text-ink ${RAISED}`
          }`}
        >
          <UIIcon name="wrench" size={15} />
          {!moving ? 'Move a part'
            : moveFrom === null ? 'Pick a part… (tap to cancel)'
            : 'Pick a new cell… (tap to cancel)'}
        </button>
      )}

      <div className="flex justify-between items-center min-h-[22px] gap-2">
        {busy && !run.reducedMotion && (
          <button
            type="button"
            onClick={run.skip}
            className={`text-body font-bold text-glow border border-glow rounded-lg px-3 py-1 min-h-[32px] ${PRESSABLE} hover:bg-glow/10`}
          >
            Skip animation
          </button>
        )}
      </div>

      </div>

      <div className="ck-rail-b flex flex-col gap-2.5">
      {playback.breakdown.length > 0 && (
        <div className={`${PANEL} px-3 py-2.5`}>
          <h2 className="text-label font-bold tracking-[.09em] uppercase text-brass mb-1.5">
            Last drop
          </h2>
          {playback.breakdown.map((line, i) => (
            <p key={i} className="text-body text-steel tabular-nums font-mono">{line}</p>
          ))}
        </div>
      )}

      <details className={`${PANEL} px-3 py-2`}>
        <summary className="text-body font-semibold text-steel hover:text-ink cursor-pointer py-1 transition-colors duration-150">
          How to play
        </summary>
        <div className="text-meta text-steel mt-2 flex flex-col gap-2">
          <p>
            Each round you draft one part and install it anywhere on the board, then
            drop marbles down a column. A marble starts at value 1 and every part it
            falls through changes it. Whatever reaches the bottom is banked.
          </p>
          <p>
            Beat the round's quota before you run out of drops. Quotas climb faster
            than adding does, so the run is really about stacking multipliers under
            the parts that feed them — a coil at the bottom of a loaded column is
            worth more than three weights scattered around.
          </p>
          <p>
            Blueprints are permanent rules for the rest of the run. Jams are the
            opposite, and last one round.
          </p>
        </div>
      </details>

      {/* Separate from How to play so it can be opened without scrolling past
          the loop explanation every time. Collapsed by default, so it costs
          nothing on a phone until it is wanted. */}
      <details
        open={refOpen}
        onToggle={(e) => {
          refTouched.current = true;
          setRefOpen((e.currentTarget as HTMLDetailsElement).open);
        }}
        className={`${PANEL} px-3 py-2`}
      >
        <summary className="text-body font-semibold text-steel hover:text-ink cursor-pointer py-1 transition-colors duration-150">
          Parts, blueprints and jams
        </summary>
        <Compendium />
      </details>
      </div>

      {state.phase.kind === 'runOver' && !modalDismissed && (
        <ResultModal
          state={state}
          won={state.phase.won}
          record={run.record}
          recordIsThisRun={run.recordIsThisRun}
          streak={run.streak}
          quota={run.quota}
          onPlayAgain={() => { setModalDismissed(false); run.restart(); }}
          onSwitchDifficulty={() => {
            setModalDismissed(false);
            run.restart({ difficulty: state.difficulty.key === 'easy' ? 'hard' : 'easy' });
          }}
          onDismiss={() => setModalDismissed(true)}
        />
      )}

      {/* Dismissing the dialog leaves the final board readable, so the way back
          has to stay on screen. */}
      {state.phase.kind === 'runOver' && modalDismissed && (
        <button
          type="button"
          onClick={() => { setModalDismissed(false); run.restart(); }}
          className={`fixed left-1/2 -translate-x-1/2 bottom-4 z-40 bg-machined-brass text-[#241a05] text-body font-bold rounded-full px-6 py-3 min-h-[48px] flex items-center gap-2 shadow-raised ${PRESSABLE}`}
        >
          <UIIcon name="replay" size={16} />
          Play again
        </button>
      )}
    </main>
  );
}

function Tab({ on, onClick, icon, children }: {
  on: boolean;
  onClick: () => void;
  icon: 'calendar' | 'infinity' | 'sun' | 'flame';
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`grow basis-[7rem] min-w-0 text-body font-bold rounded-[10px] py-2 min-h-[38px] flex items-center justify-center gap-1.5 border ${PRESSABLE} ${
        on
          ? 'text-brass border-brass bg-brass/[0.1] shadow-sunk'
          : 'text-steel border-edge bg-raised shadow-raised hover:text-ink hover:border-steel'
      }`}
    >
      <UIIcon name={icon} size={14} />
      {children}
    </button>
  );
}
