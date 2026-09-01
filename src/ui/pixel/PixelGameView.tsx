import { Board } from '../Board.js';
import { Icon, UIIcon } from '../icons.js';
import type { IconName } from '../icons.js';
import { PixelPart, hasPixelArt } from './PixelSprite.js';
import { BLUEPRINTS, PARTS } from '../../game/content.js';
import { COLS, column } from '../../game/types.js';
import type { CellIndex } from '../../game/types.js';
import type { usePayloadRun } from '../usePayloadRun.js';
import type { HeatTier } from '../../game/preview.js';

/**
 * The pixel skin's own page.
 *
 * A separate component tree rather than CSS over the classic one, because the
 * two compositions genuinely differ: classic is a three-column cockpit with
 * full-height rails, and this is a centred shell with a thin header, a compact
 * HUD rail, the board as the hero, a narrow support rail, and the draft
 * underneath. Repainting the cockpit could never produce that, which is what
 * the previous attempt proved.
 *
 * Everything here is presentation. State, playback, scoring, drafting and the
 * engine are shared unchanged: this takes the same `run` object the classic
 * view does and renders it differently. `Board` itself is shared, since the
 * grid is identical in both skins and only its chrome differs.
 */

interface Props {
  readonly run: ReturnType<typeof usePayloadRun>;
  readonly heat: ReadonlyMap<CellIndex, HeatTier>;
  readonly forkReach: ReadonlySet<CellIndex>;
  readonly path: readonly CellIndex[];
  readonly movable: ReadonlySet<CellIndex>;
  readonly placeable: boolean;
  readonly totals: readonly number[];
  readonly canMove: boolean;
  readonly moving: boolean;
  readonly moveFrom: CellIndex | null;
  readonly resetArmed: boolean;
  readonly sheetOpen: boolean;
  readonly onCellPress: (cell: CellIndex) => void;
  readonly onPeek: (col: number | null) => void;
  readonly onToggleMove: () => void;
  readonly onReset: () => void;
  readonly onToggleSheet: () => void;
  readonly settings: React.ReactNode;
}

/** One compact stat block in the left rail. */
function Stat({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="px-stat">
      <span className="px-stat-label">{label}</span>
      <span className="px-stat-value">{children}</span>
    </div>
  );
}

export function PixelGameView({
  run, heat, forkReach, path, movable, placeable, totals, canMove, moving, moveFrom,
  resetArmed, sheetOpen, onCellPress, onPeek, onToggleMove, onReset, onToggleSheet, settings,
}: Props) {
  const { state, playback, busy } = run;
  const drafting = state.phase.kind === 'drafting';
  const pct = Math.min(100, (state.roundScore / run.quota) * 100);

  return (
    <div className="px-shell">
      {/* One thin header. Title left, the two numbers a player checks most
          often right, and nothing else competing above the board. */}
      <header className="px-header">
        <h1 className="px-title">Pay<span>load</span></h1>
        <div className="px-header-stats">
          <span className="px-hstat">
            <b className="px-hstat-label">Round</b>
            <b className="px-hstat-num">{state.round + 1} / {state.difficulty.rounds}</b>
          </span>
          <span className="px-hstat">
            <b className="px-hstat-label">Score</b>
            <b className="px-hstat-num px-gold">{state.total}</b>
          </span>
        </div>
        <div className="px-header-controls">
          <button
            type="button"
            onClick={onReset}
            className={`px-btn px-btn-sm${resetArmed ? ' px-btn-danger' : ''}`}
          >
            <UIIcon name="reset" size={14} />
            <span className={resetArmed ? '' : 'sr-only'}>
              {resetArmed ? 'Reset run?' : 'Reset the run'}
            </span>
          </button>
          <button
            type="button"
            aria-expanded={sheetOpen}
            aria-controls="settings-sheet"
            onClick={onToggleSheet}
            className="px-btn px-btn-sm"
          >
            {state.mode === 'daily' ? 'Daily' : 'Free'} · {state.difficulty.key === 'easy' ? 'Easy' : 'Hard'}
            <UIIcon name="sliders" size={14} />
          </button>
        </div>
      </header>

      {sheetOpen && <div id="settings-sheet" className="px-panel px-settings">{settings}</div>}

      {/* Left rail, board, right rail. The rails are narrow on purpose: the
          board is the only thing here that should read as large. */}
      <div className="px-play">
        <aside className="px-rail px-rail-hud">
          <div className="px-panel px-quota">
            <span className="px-stat-label">Quota</span>
            <span className="px-quota-num">
              <b>{state.roundScore}</b> / {run.quota}
            </span>
            <div className="px-bar"><div className="px-bar-fill" style={{ width: `${pct}%` }} /></div>
          </div>

          <div className="px-panel">
            <Stat label="Drops">
              {/* Pips and the number. The number is the accessible reading and
                  the one that stays correct past six. */}
              <span aria-hidden className="px-pips">
                {Array.from({ length: Math.min(state.dropsLeft, 6) }, (_, i) => (
                  <i key={i} className="px-pip" />
                ))}
              </span>
              <b className="px-gold">{state.dropsLeft}</b>
            </Stat>
          </div>

          <div className="px-panel">
            <Stat label="Banked">
              <b>{state.total}</b>
              {playback.ticking && (
                <b key={playback.tick} className="px-tick">+{playback.tick}</b>
              )}
            </Stat>
          </div>

          {canMove && (
            <button
              type="button"
              onClick={onToggleMove}
              className={`px-btn${moving ? ' px-btn-on' : ''}`}
            >
              <UIIcon name="wrench" size={14} />
              {!moving ? 'Move a part'
                : moveFrom === null ? 'Pick a part…'
                : 'Pick a cell…'}
            </button>
          )}
        </aside>

        <div className="px-boardwrap ck-machine">
          <div className="px-drops">
            {Array.from({ length: COLS }, (_, c) => {
              const total = totals[c];
              const best = total !== undefined && total > 0
                && total === Math.max(...totals.filter((t): t is number => t !== undefined));
              return (
                <button
                  key={c}
                  type="button"
                  aria-label={
                    total === undefined
                      ? `Drop a marble down column ${c + 1}`
                      : `Drop a marble down column ${c + 1}. Would bank ${total}${best ? ', the best column' : ''}`
                  }
                  disabled={state.phase.kind !== 'playing' || busy || state.dropsLeft <= 0}
                  onClick={() => void run.drop(column(c))}
                  onPointerEnter={() => onPeek(c)}
                  onPointerLeave={() => onPeek(null)}
                  onFocus={() => onPeek(c)}
                  onBlur={() => onPeek(null)}
                  className={`px-drop${best ? ' px-drop-best' : ''}`}
                >
                  <UIIcon name="drop" size={14} />
                  {total !== undefined && <span aria-hidden className="px-drop-num">{total}</span>}
                </button>
              );
            })}
          </div>

          <div className={`px-board${placeable ? ' is-placing' : ''}`}>
            <Board
              board={state.board}
              placeable={placeable}
              heat={heat}
              forkReach={forkReach}
              path={path}
              firingCells={playback.firingCells}
              firingSeq={playback.firingSeq}
              stepMs={playback.stepMs}
              marbles={playback.marbles}
              labels={playback.labels}
              movable={movable}
              pixel
              onCellPress={onCellPress}
            />
            {run.cleared > 0 && (
              <p aria-hidden className="px-cleared">Quota beaten</p>
            )}
          </div>

          {busy && !run.reducedMotion && (
            <button type="button" onClick={run.skip} className="px-btn px-btn-sm px-skip">
              Skip animation
            </button>
          )}
        </div>

        <aside className="px-rail px-rail-support">
          {run.jam ? (
            <div className="px-panel px-jam">
              <span className="px-stat-label px-danger">
                <UIIcon name="alert" size={12} /> Jam
              </span>
              <b className="px-jam-name">{run.jam.name}</b>
              <span className="px-note">{run.jam.rule}</span>
            </div>
          ) : (
            <div className="px-panel px-empty">
              <span className="px-stat-label">Jam</span>
              <span className="px-note">None active.</span>
            </div>
          )}

          <div className="px-panel">
            <span className="px-stat-label px-blue">Blueprints</span>
            {state.blueprints.size === 0 ? (
              <span className="px-note">None yet.</span>
            ) : (
              <ul aria-label="Blueprints in effect" className="px-bplist">
                {[...state.blueprints].map((key) => (
                  <li key={key} aria-label={`${BLUEPRINTS[key].name}. ${BLUEPRINTS[key].rule}`}>
                    <Icon name={BLUEPRINTS[key].glyph as IconName} size={13} />
                    <span>{BLUEPRINTS[key].name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {/* The draft sits under the board, centred on it. Three real offers. */}
      {drafting && (
        <section className="px-draft">
          <div className="px-draft-head">
            <h2 className="px-draft-title">Draft: choose 1 part</h2>
            <button
              type="button"
              onClick={() => run.dispatch({ type: 'skipDraft' })}
              className="px-btn px-btn-sm"
            >
              Skip
            </button>
          </div>
          <div className="px-cards">
            {state.phase.offers.map((key, i) => {
              const on = state.phase.kind === 'drafting' && state.phase.selected === i;
              return (
                <button
                  key={`${key}-${i}`}
                  type="button"
                  onClick={() => run.dispatch({ type: 'selectOffer', index: i })}
                  aria-pressed={on}
                  className={`px-card${on ? ' px-card-on' : ''}`}
                >
                  {hasPixelArt(key)
                    ? <PixelPart part={key} size="32px" />
                    : <Icon name={PARTS[key].glyph as IconName} size={30} />}
                  <b className="px-card-name">{PARTS[key].name}</b>
                  <span className="px-card-rule">{PARTS[key].rule}</span>
                </button>
              );
            })}
          </div>
          <p className="px-note px-draft-hint">Pick a card, then tap an empty cell.</p>
        </section>
      )}

      {state.phase.kind === 'blueprint' && (
        <section className="px-draft">
          <h2 className="px-draft-title px-blue">A blueprint surfaces</h2>
          <div className="px-cards">
            {state.phase.offers.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => run.dispatch({ type: 'takeBlueprint', key })}
                className="px-card"
              >
                <Icon name={BLUEPRINTS[key].glyph as IconName} size={30} className="px-blue" />
                <b className="px-card-name">{BLUEPRINTS[key].name}</b>
                <span className="px-card-rule">{BLUEPRINTS[key].rule}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* The drop breakdown, which is the one thing that explains a score, kept
          as a thin strip rather than a panel beside the board. */}
      {playback.breakdown.length > 0 && (
        <section className="px-readout">
          <span className="px-stat-label">Last drop</span>
          <div className="px-readout-lines">
            {playback.breakdown.map((line, i) => <span key={i}>{line}</span>)}
          </div>
        </section>
      )}

      <p role="status" aria-live="polite" className="sr-only">{playback.announcement}</p>
    </div>
  );
}
