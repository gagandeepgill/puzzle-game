import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { shareText } from '../game/daily.js';
import type { DailyRecord, Streak } from '../game/daily.js';
import type { RunState } from '../game/types.js';

interface Props {
  readonly state: RunState;
  readonly won: boolean;
  /** The stored daily result. Null in free play, or before it is written. */
  readonly record: DailyRecord | null;
  /** False when the record predates this run, i.e. the player is replaying. */
  readonly recordIsThisRun: boolean;
  readonly streak: Streak;
  readonly quota: number;
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
  state, won, record, recordIsThisRun, streak, quota, onPlayAgain,
  onSwitchDifficulty, onDismiss,
}: Props) {
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);
  // Read through a ref so the effect below can hold empty deps. Depending on
  // the prop meant an inline arrow from the caller re-ran the whole effect on
  // every render, toggling `inert` off and back on each time.
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  /**
   * Captured in a layout effect, and deliberately not in the effect below.
   * React commits `autoFocus` during the layout phase, which runs before
   * passive effects — so reading activeElement there returns this dialog's
   * own Play-again button, and "restore focus" restores it to itself.
   *
   * Empty deps: capture the opener once, not on every render.
   */
  useLayoutEffect(() => {
    openerRef.current = document.activeElement;
  }, []);

  useEffect(() => {
    const app = document.getElementById('app-root');
    if (app) app.inert = true;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { dismissRef.current(); return; }
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
  }, []);

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
        {/* The gap is the lesson. "More than the machine paid" tells a player
            nothing they can act on; 145 against 96 tells them they needed a
            multiplier two rounds ago. */}
        <p className="text-[13.5px] text-steel leading-normal">
          {won
            ? `Every quota on the ${state.difficulty.name} line, beaten.`
            : `Round ${state.round + 1} demanded ${quota}; the machine paid ${state.roundScore}.`}
        </p>

        {/* Labelled, because on a replay these two blocks disagree and read
            as a bug. The stats are the run just played; the block below is
            the first attempt, which is the one that counts and gets posted. */}
        {record && !recordIsThisRun && <Caption>This run</Caption>}
        <div className="flex gap-2">
          <Stat value={`${won ? state.difficulty.rounds : state.round}/${state.difficulty.rounds}`} label="rounds" />
          <Stat value={String(state.total)} label="banked" />
          <Stat value={String(state.bestDrop)} label="best drop" />
        </div>

        {/* Daily only. The record is written on the first attempt, so this is
            what the player is sharing even if they replay afterwards. */}
        {record && (
          <div className="bg-card border border-edge rounded-[11px] p-2.5 flex flex-col gap-2">
            <Caption>
              {recordIsThisRun ? "Today's result" : "Today's result — your first attempt"}
            </Caption>
            {!recordIsThisRun && (
              <p className="text-[11px] text-steel leading-snug -mt-1">
                You already played today. Replays won't change what is locked in.
              </p>
            )}
            <pre className="text-[11.5px] text-steel font-sans whitespace-pre-wrap leading-snug">
              {shareText(record, state.variant, streak)}
            </pre>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(shareText(record, state.variant, streak));
                  setCopied(true);
                } catch {
                  // Denied permission, or an insecure origin. The text is on
                  // screen above, so there is still a way to share it.
                  setCopied(false);
                }
              }}
              className="text-[12.5px] font-bold text-glow border border-glow rounded-[9px] py-2 min-h-[40px]"
            >
              {copied ? '✓ Copied' : 'Copy result'}
            </button>
          </div>
        )}

        <button
          type="button"
          autoFocus
          onClick={onPlayAgain}
          className="bg-brass text-[#241a05] font-bold rounded-[11px] py-3 min-h-[46px]"
        >
          Play again
        </button>
        {/* Losing on Easy and being offered Hard reads as a taunt. */}
        {(won || state.difficulty.key === 'hard') && (
          <button
            type="button"
            onClick={onSwitchDifficulty}
            className="text-[13px] font-semibold text-glow border border-dashed border-glow/60 rounded-[10px] py-2.5 min-h-[44px]"
          >
            {won ? `Ready for more? Try ${other}` : `Try ${other} instead`}
          </button>
        )}
      </div>
    </div>,
    document.body,
  );
}

function Caption({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-[.08em] text-steel">{children}</p>
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
