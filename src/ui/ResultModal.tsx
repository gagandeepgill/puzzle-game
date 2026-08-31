import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { RunState } from '../game/types.js';

interface Props {
  readonly state: RunState;
  readonly won: boolean;
  readonly onPlayAgain: () => void;
  readonly onSwitchDifficulty: () => void;
  readonly onDismiss: () => void;
}

/**
 * End-of-run dialog.
 *
 * Portalled to a sibling of the app root on purpose. `inert` has to go on
 * <main>, and a dialog rendered inside <main> would be inerted along with it.
 * aria-modal is a claim; inert plus a Tab trap is the behaviour.
 */
export function ResultModal({
  state, won, onPlayAgain, onSwitchDifficulty, onDismiss,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);

  useEffect(() => {
    openerRef.current = document.activeElement;
    const app = document.getElementById('app-root');
    if (app) app.inert = true;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onDismiss(); return; }
      if (e.key !== 'Tab' || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('button')]
        .filter((b) => b.offsetParent !== null);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKey);

    return () => {
      document.removeEventListener('keydown', onKey);
      if (app) app.inert = false;
      // Return focus to whatever opened this, so a keyboard player is not
      // dropped at the top of the document.
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
    };
  }, [onDismiss]);

  const other = state.difficulty.key === 'easy' ? 'Hard · 8 rounds' : 'Easy · 4 rounds';

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onDismiss(); }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="over-title"
        className={`relative w-full max-w-[380px] bg-panel border rounded-[18px] p-5 flex flex-col gap-3 animate-pop ${
          won ? 'border-ok' : 'border-bad'
        }`}
      >
        <button
          type="button"
          onClick={onDismiss}
          aria-label="View the board"
          className="absolute top-2.5 right-2.5 w-9 h-9 text-steel border border-edge rounded-[9px] flex items-center justify-center"
        >
          <span aria-hidden>✕</span>
        </button>

        <div aria-hidden className="text-[40px] leading-none">{won ? '🏆' : '💥'}</div>
        <h2 id="over-title" className="font-display text-[25px] leading-tight">
          {won ? 'The Grand Payout' : 'The machine seized'}
        </h2>
        <p className="text-[13.5px] text-steel leading-normal">
          {won
            ? `Every quota on the ${state.difficulty.name} line, beaten.`
            : `Round ${state.round + 1} demanded more than the machine paid. Additive parts alone can't outrun the curve.`}
        </p>

        <div className="flex gap-2">
          <Stat value={`${won ? state.difficulty.rounds : state.round}/${state.difficulty.rounds}`} label="rounds" />
          <Stat value={String(state.total)} label="banked" />
          <Stat value={String(state.bestDrop)} label="best drop" />
        </div>

        <button
          type="button"
          autoFocus
          onClick={onPlayAgain}
          className="bg-brass text-[#241a05] font-bold rounded-[11px] py-3 min-h-[46px]"
        >
          Play again
        </button>
        <button
          type="button"
          onClick={onSwitchDifficulty}
          className="text-[13px] font-semibold text-glow border border-dashed border-glow/60 rounded-[10px] py-2.5 min-h-[44px]"
        >
          {won ? `Ready for more? Try ${other}` : `Try ${other} instead`}
        </button>
      </div>
    </div>,
    document.body,
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
