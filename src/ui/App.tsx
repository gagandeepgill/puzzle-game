import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Board } from './Board.js';
import { ResultModal } from './ResultModal.js';
import { usePayloadRun } from './usePayloadRun.js';
import { PARTS, BLUEPRINTS } from '../game/content.js';
import { COLS, ROWS, cellAt, column } from '../game/types.js';
import type { CellIndex, DifficultyKey, Mode } from '../game/types.js';

export function App() {
  const run = usePayloadRun({ mode: 'daily', difficulty: 'easy' });
  const { state, playback, busy } = run;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [modalDismissed, setModalDismissed] = useState(false);
  /** null = not moving; a cell = that part is picked up and awaiting a target. */
  const [moveFrom, setMoveFrom] = useState<CellIndex | null>(null);
  const [moving, setMoving] = useState(false);
  const [resetArmed, setResetArmed] = useState(false);

  const drafting = state.phase.kind === 'drafting';
  const placeable = drafting && state.phase.selected !== null;
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

  const onCellPress = useCallback((cell: CellIndex) => {
    if (moving) {
      if (moveFrom === null) { setMoveFrom(cell); return; }
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

  useEffect(() => {
    if (!resetArmed) return;
    const t = setTimeout(() => setResetArmed(false), 2500);
    return () => clearTimeout(t);
  }, [resetArmed]);

  return (
    <main id="app-root" className="w-full max-w-[430px] mx-auto flex flex-col gap-2.5 px-2.5 pt-3.5 pb-6">
      <header className="flex items-baseline justify-between">
        <h1 className="font-display font-bold text-[27px]">
          Pay<span className="text-brass">load</span>
        </h1>
        <div className="flex items-center gap-1.5">
          {/* Two taps, because one stray press should not throw away a run.
              The armed state disarms itself after 2.5s. */}
          <button
            type="button"
            onClick={() => (resetArmed ? startOver() : setResetArmed(true))}
            className={`text-[12.5px] font-semibold rounded-[9px] px-2.5 min-h-[34px] border ${
              resetArmed ? 'text-bad border-bad' : 'text-steel border-edge bg-panel'
            }`}
          >
            {resetArmed ? 'Reset run?' : <span aria-hidden>↺</span>}
            <span className="sr-only">{resetArmed ? '' : 'Reset the run'}</span>
          </button>
          <button
            type="button"
            aria-expanded={sheetOpen}
            aria-controls="settings-sheet"
            onClick={() => setSheetOpen((o) => !o)}
            className="text-[12.5px] font-semibold text-ink bg-panel border border-edge rounded-[9px] px-3 min-h-[34px]"
          >
            {state.mode === 'daily' ? 'Daily' : 'Free'} · {state.difficulty.key === 'easy' ? 'Easy' : 'Hard'} ⚙
          </button>
        </div>
      </header>

      {sheetOpen && (
        <div id="settings-sheet" className="bg-panel border border-edge rounded-xl p-2.5 flex flex-col gap-2">
          <div role="group" aria-label="Mode" className="flex gap-1.5">
            <Tab on={state.mode === 'daily'} onClick={() => setMode('daily')}>Daily</Tab>
            <Tab on={state.mode === 'free'} onClick={() => setMode('free')}>Free Play</Tab>
          </div>
          <div role="group" aria-label="Difficulty" className="flex gap-1.5">
            <Tab on={state.difficulty.key === 'easy'} onClick={() => setDifficulty('easy')}>Easy · 4</Tab>
            <Tab on={state.difficulty.key === 'hard'} onClick={() => setDifficulty('hard')}>Hard · 8</Tab>
          </div>
          {state.variant && (
            <p className="text-[12px] text-steel leading-snug">
              <b className="text-ink">{state.variant.icon} {state.variant.name}.</b> {state.variant.desc}
            </p>
          )}
        </div>
      )}

      <div className="bg-panel border border-edge rounded-xl px-3 py-2">
        <div className="flex justify-between items-baseline text-[12.5px] text-steel tabular-nums">
          <span>Round <b className="font-display text-[19px] text-ink">{state.round + 1} / {state.difficulty.rounds}</b></span>
          <span>Quota <b className="font-display text-[19px] text-brass">{run.quota}</b></span>
        </div>
        <div className="h-[6px] bg-card rounded-[5px] mt-1.5 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-copper to-brass rounded-[5px] transition-[width] duration-300"
            style={{ width: `${Math.min(100, (state.roundScore / run.quota) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between items-baseline text-[11.5px] text-steel mt-1.5 tabular-nums">
          <span>
            Score <b className="text-ink font-bold text-[13px]">{state.roundScore}</b>
            {/* Climbs as each marble banks, so the round score is not a single
                jump from nowhere once the drop has already finished. */}
            {playback.ticking && (
              <b key={playback.tick} className="ml-1 inline-block text-ok font-bold animate-pop">
                +{playback.tick}
              </b>
            )}
          </span>
          <span>Drops left <b className="text-brass font-bold text-[13px]">{state.dropsLeft}</b></span>
          <span>Banked <b className="text-ink font-bold text-[13px]">{state.total}</b></span>
        </div>
        {run.jam && <p className="mt-1.5 text-[12px] font-bold text-bad">{run.jam.text}</p>}

        {/* Blueprints are permanent and change the arithmetic, so they have to
            stay visible after their draft panel closes. Gravity Well in
            particular is otherwise invisible. */}
        {state.blueprints.size > 0 && (
          <ul aria-label="Blueprints in effect" className="flex flex-wrap gap-1 mt-1.5">
            {[...state.blueprints].map((key) => (
              <li
                key={key}
                title={BLUEPRINTS[key].rule}
                className="text-[10.5px] font-semibold text-glow border border-glow/50 bg-glow/[0.07] rounded-full px-2 py-0.5"
              >
                <span aria-hidden>{BLUEPRINTS[key].glyph} </span>{BLUEPRINTS[key].name}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Written once per drop, after it resolves. Deriving it from render-time
          state announced partial totals against a round that had already been
          reset by clearing the quota. */}
      <p role="status" aria-live="polite" className="sr-only">
        {playback.announcement}
      </p>

      {/* Compact on purpose. At the original sizes this panel ran 228px tall,
          which pushed the board 59% down a 375x812 phone and let it overflow
          by 70px — you could not see the machine you were drafting for. */}
      {drafting && (
        <div className="bg-panel border border-brass rounded-[13px] p-2.5 flex flex-col gap-1.5">
          <div className="flex justify-between items-center">
            <h2 className="font-display text-[14px] font-bold text-brass">Draft a part</h2>
            <button
              type="button"
              onClick={() => run.dispatch({ type: 'skipDraft' })}
              className="text-[12px] font-semibold text-steel border border-edge rounded-lg px-2.5 py-1"
            >
              Skip
            </button>
          </div>
          <div className="flex gap-1.5">
            {state.phase.offers.map((key, i) => (
              <button
                key={`${key}-${i}`}
                type="button"
                onClick={() => run.dispatch({ type: 'selectOffer', index: i })}
                aria-pressed={state.phase.kind === 'drafting' && state.phase.selected === i}
                className={`flex-1 bg-card rounded-[10px] px-1.5 py-1.5 flex flex-col items-center gap-0.5 border-[1.5px] ${
                  state.phase.kind === 'drafting' && state.phase.selected === i
                    ? 'border-brass bg-brass/[0.08]' : 'border-edge'
                }`}
              >
                <span aria-hidden className="text-[18px] leading-none">{PARTS[key].glyph}</span>
                <span className="font-bold text-[11.5px] leading-tight text-center">{PARTS[key].name}</span>
                <span className="text-[10px] text-steel leading-[1.25] text-center">{PARTS[key].rule}</span>
              </button>
            ))}
          </div>
          <span className="text-[11.5px] text-steel">Pick a card, then tap an empty cell.</span>
        </div>
      )}

      {state.phase.kind === 'blueprint' && (
        <div className="bg-panel border border-glow rounded-[13px] p-3 flex flex-col gap-2">
          <h2 className="font-display text-base font-bold text-glow">A blueprint surfaces</h2>
          <div className="flex gap-2">
            {state.phase.offers.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => run.dispatch({ type: 'takeBlueprint', key })}
                className="flex-1 bg-card border-[1.5px] border-edge rounded-[11px] px-1.5 py-2.5 flex flex-col gap-1"
              >
                <span aria-hidden className="text-[23px]">{BLUEPRINTS[key].glyph}</span>
                <span className="font-bold text-[13px]">{BLUEPRINTS[key].name}</span>
                <span className="text-[11px] text-steel leading-snug">{BLUEPRINTS[key].rule}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* The drop row and the board share a width and an inset so each arrow
          sits over its own column. The board panel's own padding used to
          offset the grid by 8px, leaving the arrows subtly out of line.
          Capping the width is also what gets all six rows onto a phone. */}
      <div className="w-full max-w-[320px] mx-auto flex flex-col gap-2">
        {/* 9px = the board panel's 8px padding plus its 1px border. */}
        <div className="grid grid-cols-5 gap-1.5 px-[9px]">
          {Array.from({ length: COLS }, (_, c) => (
            <button
              key={c}
              type="button"
              aria-label={`Drop a marble down column ${c + 1}`}
              disabled={state.phase.kind !== 'playing' || busy || state.dropsLeft <= 0}
              onClick={() => void run.drop(column(c))}
              className="bg-card text-brass border border-edge rounded-[9px] min-h-[44px] text-[17px] font-bold disabled:opacity-35"
            >
              <span aria-hidden>▼</span>
            </button>
          ))}
        </div>

        <Board
          board={state.board}
          placeable={placeable}
          firingCell={playback.firingCell}
          firingSeq={playback.firingSeq}
          marbles={playback.marbles}
          labels={playback.labels}
          movable={movable}
          onCellPress={onCellPress}
        />
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
          className={`self-center text-[12.5px] font-bold rounded-[10px] px-3 min-h-[36px] border ${
            moving ? 'text-glow border-glow bg-glow/[0.09]' : 'text-steel border-edge bg-panel'
          }`}
        >
          {!moving ? '🔧 Move a part'
            : moveFrom === null ? 'Pick a part… (tap to cancel)'
            : 'Pick a new cell… (tap to cancel)'}
        </button>
      )}

      <div className="flex justify-between items-center min-h-[22px] gap-2">
        {busy && !run.reducedMotion && (
          <button
            type="button"
            onClick={run.skip}
            className="text-[12px] font-bold text-glow border border-glow rounded-lg px-3 py-1"
          >
            Skip animation
          </button>
        )}
      </div>

      {playback.breakdown.length > 0 && (
        <div className="bg-panel border border-edge rounded-xl px-3 py-2.5">
          <h2 className="text-[10px] font-bold tracking-[.09em] uppercase text-brass mb-1.5">
            Last drop
          </h2>
          {playback.breakdown.map((line, i) => (
            <p key={i} className="text-[12.5px] text-steel tabular-nums font-mono">{line}</p>
          ))}
        </div>
      )}

      {state.phase.kind === 'runOver' && !modalDismissed && (
        <ResultModal
          state={state}
          won={state.phase.won}
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
          className="fixed left-1/2 -translate-x-1/2 bottom-4 z-40 bg-brass text-[#241a05] font-bold rounded-full px-6 py-3 shadow-lg"
        >
          ↻ Play again
        </button>
      )}
    </main>
  );
}

function Tab({ on, onClick, children }: {
  on: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`flex-1 text-[13px] font-bold rounded-[10px] py-2 border ${
        on ? 'text-brass border-brass bg-brass/[0.07]' : 'text-steel border-edge bg-panel'
      }`}
    >
      {children}
    </button>
  );
}
