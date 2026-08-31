import { useState } from 'react';
import { Board } from './Board.js';
import { usePayloadRun } from './usePayloadRun.js';
import { PARTS, BLUEPRINTS } from '../game/content.js';
import { COLS, column } from '../game/types.js';
import type { CellIndex, DifficultyKey, Mode } from '../game/types.js';

export function App() {
  const run = usePayloadRun({ mode: 'daily', difficulty: 'easy' });
  const { state, playback, busy } = run;
  const [sheetOpen, setSheetOpen] = useState(false);

  const drafting = state.phase.kind === 'drafting';
  const placeable = drafting && state.phase.selected !== null;

  const onCellPress = (cell: CellIndex) => {
    if (drafting && state.phase.selected !== null) {
      run.dispatch({ type: 'placeSelected', cell });
    }
  };

  const setMode = (mode: Mode) => run.restart({ mode });
  const setDifficulty = (difficulty: DifficultyKey) => run.restart({ difficulty });

  return (
    <main className="w-full max-w-[430px] mx-auto flex flex-col gap-2.5 px-2.5 pt-3.5 pb-6">
      <header className="flex items-baseline justify-between">
        <h1 className="font-display font-bold text-[27px]">
          Pay<span className="text-brass">load</span>
        </h1>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-expanded={sheetOpen}
            onClick={() => setSheetOpen((o) => !o)}
            className="text-[12.5px] font-semibold text-ink bg-panel border border-edge rounded-[9px] px-3 min-h-[34px]"
          >
            {state.mode === 'daily' ? 'Daily' : 'Free'} · {state.difficulty.key === 'easy' ? 'Easy' : 'Hard'} ⚙
          </button>
        </div>
      </header>

      {sheetOpen && (
        <div className="bg-panel border border-edge rounded-xl p-2.5 flex flex-col gap-2">
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

      <div className="bg-panel border border-edge rounded-xl px-3 py-2.5">
        <div className="flex justify-between items-baseline text-[13px] text-steel tabular-nums">
          <span>Round <b className="font-display text-[21px] text-ink">{state.round + 1} / {state.difficulty.rounds}</b></span>
          <span>Quota <b className="font-display text-[21px] text-brass">{run.quota}</b></span>
        </div>
        <div className="h-[7px] bg-card rounded-[5px] mt-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-copper to-brass rounded-[5px] transition-[width] duration-300"
            style={{ width: `${Math.min(100, (state.roundScore / run.quota) * 100)}%` }}
          />
        </div>
        <div className="flex justify-between text-[12px] text-steel mt-2 tabular-nums">
          <span>Score <b className="text-ink font-bold text-[13.5px]">{state.roundScore}</b></span>
          <span>Drops left <b className="text-brass font-bold text-[13.5px]">{state.dropsLeft}</b></span>
          <span>Banked <b className="text-ink font-bold text-[13.5px]">{state.total}</b></span>
        </div>
        {run.jam && <p className="mt-2 text-[12.5px] font-bold text-bad">{run.jam.text}</p>}
      </div>

      <p role="status" aria-live="polite" className="sr-only">
        {playback.breakdown.length > 0
          ? `Drop scored ${playback.tick}. Round score ${state.roundScore} of ${run.quota}. ${state.dropsLeft} drops left.`
          : ''}
      </p>

      {drafting && (
        <div className="bg-panel border border-brass rounded-[13px] p-3 flex flex-col gap-2">
          <h2 className="font-display text-base font-bold text-brass">Draft a part</h2>
          <div className="flex gap-2">
            {state.phase.offers.map((key, i) => (
              <button
                key={`${key}-${i}`}
                type="button"
                onClick={() => run.dispatch({ type: 'selectOffer', index: i })}
                aria-pressed={state.phase.kind === 'drafting' && state.phase.selected === i}
                className={`flex-1 bg-card rounded-[11px] px-1.5 py-2.5 flex flex-col gap-1 border-[1.5px] ${
                  state.phase.kind === 'drafting' && state.phase.selected === i
                    ? 'border-brass bg-brass/[0.08]' : 'border-edge'
                }`}
              >
                <span aria-hidden className="text-[23px]">{PARTS[key].glyph}</span>
                <span className="font-bold text-[13px]">{PARTS[key].name}</span>
                <span className="text-[11px] text-steel leading-snug">{PARTS[key].rule}</span>
              </button>
            ))}
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[12px] text-steel">Pick a card, then tap an empty cell.</span>
            <button
              type="button"
              onClick={() => run.dispatch({ type: 'skipDraft' })}
              className="text-[12.5px] font-semibold text-steel border border-edge rounded-lg px-3 py-1.5"
            >
              Skip
            </button>
          </div>
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

      <div className="grid grid-cols-5 gap-1.5">
        {Array.from({ length: COLS }, (_, c) => (
          <button
            key={c}
            type="button"
            aria-label={`Drop a marble down column ${c + 1}`}
            disabled={state.phase.kind !== 'playing' || busy || state.dropsLeft <= 0}
            onClick={() => void run.drop(column(c))}
            className="bg-card text-brass border border-edge rounded-[9px] py-2.5 min-h-[44px] text-[17px] font-bold disabled:opacity-35"
          >
            <span aria-hidden>▼</span>
          </button>
        ))}
      </div>

      <Board
        board={state.board}
        placeable={placeable}
        firingCell={playback.firingCell}
        onCellPress={onCellPress}
      />

      <div className="flex justify-between items-center min-h-[22px] gap-2">
        {busy && (
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

      {state.phase.kind === 'runOver' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="over-title"
            className="w-full max-w-[380px] bg-panel border border-brass rounded-[18px] p-5 flex flex-col gap-3 animate-pop"
          >
            <h2 id="over-title" className="font-display text-[25px]">
              {state.phase.won ? 'The Grand Payout' : 'The machine seized'}
            </h2>
            <div className="flex gap-2">
              <Stat value={`${state.round + (state.phase.won ? 1 : 0)}/${state.difficulty.rounds}`} label="rounds" />
              <Stat value={String(state.total)} label="banked" />
              <Stat value={String(state.bestDrop)} label="best drop" />
            </div>
            <button
              type="button"
              autoFocus
              onClick={() => run.restart({})}
              className="bg-brass text-[#241a05] font-bold rounded-[11px] py-3 min-h-[46px]"
            >
              Play again
            </button>
          </div>
        </div>
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

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="flex-1 bg-card border border-edge rounded-[11px] py-2.5 flex flex-col items-center gap-0.5">
      <span className="font-display text-[21px] font-bold text-brass tabular-nums">{value}</span>
      <span className="text-[10px] text-steel uppercase tracking-[.07em]">{label}</span>
    </div>
  );
}
