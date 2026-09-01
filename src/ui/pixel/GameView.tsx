import { Board } from '../Board.js';
import { Icon, UIIcon } from '../icons.js';
import type { IconName } from '../icons.js';
import { PixelPart, UI_SPRITE, hasPixelArt } from './PixelSprite.js';
import { BLUEPRINTS, PARTS } from '../../game/content.js';
import { COLS, column } from '../../game/types.js';
import type { CellIndex } from '../../game/types.js';
import type { usePayloadRun } from '../usePayloadRun.js';
import type { HeatTier } from '../../game/preview.js';
import { ICON_ART } from './hudArt.js';

/**
 * The `game` theme: the rework against the reference sheet.
 *
 * Added alongside `pixel` rather than replacing it. The first pass stays
 * exactly as it shipped and this is a second reading of the same reference,
 * so neither overwrites the other and both can be compared side by side.
 *
 * Closer to the sheet than `pixel` in the parts that were approximations
 * before: every header item is its own bordered box, the HUD is three separate
 * boxes with the banked diamond, Jam and Blueprints carry their supplied
 * icons, draft cards are purple and take a green border with a check when
 * selected, and placement shows the green and red cell states.
 *
 * What the sheet shows and this deliberately does not implement, because the
 * specs forbid inventing mechanics and the game has none of them:
 *
 *   - card cost badges (1/2/3) — there is no currency to spend
 *   - card rarity glow — parts have no rarity
 *   - TAKE 1 / ENTER — drafting is select-then-place, with no confirm step,
 *     and adding one would change the flow rather than restyle it
 *
 * Everything rendered here is real run state.
 */

/**
 * Grouped digits, which is how every number in the mockup is set: SCORE reads
 * 12,450 rather than 12450. Presentation only — the value is unchanged and
 * the screen reader gets the same number either way.
 */
const n = (value: number) => value.toLocaleString();

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

/** One bordered stat box in the left rail. */
function Box({ label, children, className = '' }: {
  label: string; children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`gm-box ${className}`}>
      <span className="gm-label">{label}</span>
      <div className="gm-box-body">{children}</div>
    </div>
  );
}

export function GameView({
  run, heat, forkReach, path, movable, placeable, totals, canMove, moving, moveFrom,
  resetArmed, sheetOpen, onCellPress, onPeek, onToggleMove, onReset, onToggleSheet, settings,
}: Props) {
  const { state, playback, busy } = run;
  const drafting = state.phase.kind === 'drafting';
  const pct = Math.min(100, (state.roundScore / run.quota) * 100);

  return (
    <div className="gm-shell">
      <header className="gm-header">
        <h1 className="gm-logo">Payload</h1>
        <span className="gm-chip">
          <b className="gm-label">Round</b>
          <b className="gm-num">{state.round + 1} / {state.difficulty.rounds}</b>
        </span>
        <span className="gm-chip">
          <b className="gm-label">Score</b>
          <b className="gm-num gm-gold">{n(state.total)}</b>
        </span>
        <span className="gm-header-spacer" />
        <button
          type="button"
          onClick={onReset}
          className={`gm-btn gm-btn-icon${resetArmed ? ' gm-btn-danger' : ''}`}
        >
          {resetArmed
            ? <img src={ICON_ART.warning} alt="" aria-hidden className="gm-icon-sm" width={32} height={32} />
            : <UIIcon name="reset" size={14} />}
          <span className={resetArmed ? '' : 'sr-only'}>
            {resetArmed ? 'Reset run?' : 'Reset the run'}
          </span>
        </button>
        <button
          type="button"
          aria-expanded={sheetOpen}
          aria-controls="settings-sheet"
          onClick={onToggleSheet}
          className="gm-btn gm-btn-icon"
        >
          <img src={UI_SPRITE.settings} alt="" aria-hidden className="gm-icon-sm" width={32} height={32} />
          <span className="sr-only">Settings</span>
        </button>
      </header>

      {sheetOpen && <div id="settings-sheet" className="gm-panel gm-settings">{settings}</div>}

      <div className="gm-play">
        <aside className="gm-rail">
          <Box label="Quota">
            <span className="gm-num">
              <b className="gm-gold">{n(state.roundScore)}</b> / {n(run.quota)}
            </span>
            <div className="gm-bar"><div className="gm-bar-fill" style={{ width: `${pct}%` }} /></div>
          </Box>

          <Box label="Drops">
            {/* Filled and empty pips, which is what the sheet's drops indicator
                shows: how many are left against how many the round started
                with, rather than a bare count. */}
            <span aria-hidden className="gm-pips">
              {Array.from({ length: Math.min(run.dropsThisRound, 8) }, (_, i) => (
                <i key={i} className={`gm-pip${i < state.dropsLeft ? ' is-on' : ''}`} />
              ))}
            </span>
            <b className="gm-num sr-only">{state.dropsLeft} left</b>
          </Box>

          <Box label="Banked" className="gm-box-inline">
            <b className="gm-num">{n(state.total)}</b>
            <span aria-hidden className="gm-diamond" />
            {playback.ticking && (
              <b key={playback.tick} className="gm-tick">+{playback.tick}</b>
            )}
          </Box>

          {canMove && (
            <button
              type="button"
              onClick={onToggleMove}
              className={`gm-btn${moving ? ' gm-btn-on' : ''}`}
            >
              <UIIcon name="wrench" size={14} />
              {!moving ? 'Move a part' : moveFrom === null ? 'Pick a part…' : 'Pick a cell…'}
            </button>
          )}
        </aside>

        <div className="gm-boardwrap">
          <div className="gm-drops">
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
                  className={`gm-drop${best ? ' is-best' : ''}`}
                >
                  <UIIcon name="drop" size={14} />
                  {total !== undefined && <span aria-hidden className="gm-drop-num">{total}</span>}
                </button>
              );
            })}
          </div>

          <div className={`gm-board${placeable ? ' is-placing' : ''}`}>
            <Board
              board={state.board}
              placeable={placeable}
              heat={heat}
              forkReach={forkReach}
              path={path}
              firingCells={playback.firingCells}
              seizedCells={playback.seizedCells}
              firingSeq={playback.firingSeq}
              stepMs={playback.stepMs}
              marbles={playback.marbles}
              labels={playback.labels}
              movable={movable}
              pixel
              onCellPress={onCellPress}
            />
            {run.cleared > 0 && <p aria-hidden className="gm-cleared">Round clear!</p>}
          </div>

          {busy && !run.reducedMotion && (
            <button type="button" onClick={run.skip} className="gm-btn gm-skip">
              Skip
            </button>
          )}
        </div>

        <div key={run.jam?.name ?? 'none'} className={`gm-panel gm-jam${run.jam ? ' is-active' : ''}`}>
          <span className="gm-label">Jam</span>
          {run.jam ? (
            <div className="gm-jam-body">
              <span className="gm-well">
                <img src={UI_SPRITE.jam} alt="" aria-hidden className="gm-icon" width={32} height={32} />
              </span>
              <b className="gm-jam-name">{run.jam.name}</b>
              <span className="gm-note">{run.jam.rule}</span>
            </div>
          ) : (
            <span className="gm-note">None active.</span>
          )}
        </div>

        <div className="gm-panel gm-bp">
          <span className="gm-label gm-label-icon">
            <img
              src={UI_SPRITE.blueprints}
              alt=""
              aria-hidden
              className="gm-icon-sm"
              width={32}
              height={32}
            />
            Blueprints
          </span>
          <span aria-hidden className="gm-well gm-bp-well">
            <img src={UI_SPRITE.blueprints} alt="" className="gm-icon" width={32} height={32} />
          </span>
          {state.blueprints.size === 0 ? (
            <span className="gm-note">None yet.</span>
          ) : (
            <ul aria-label="Blueprints in effect" className="gm-bplist">
              {[...state.blueprints].map((key) => (
                <li key={key} aria-label={`${BLUEPRINTS[key].name}. ${BLUEPRINTS[key].rule}`}>
                  <Icon name={BLUEPRINTS[key].glyph as IconName} size={13} />
                  <span>{BLUEPRINTS[key].name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {drafting && (
        <section className="gm-draft">
          <div className="gm-draft-head">
            <h2 className="gm-draft-title">Draft: choose 1 part</h2>
            <button
              type="button"
              onClick={() => run.dispatch({ type: 'skipDraft' })}
              className="gm-btn"
            >
              Skip
            </button>
          </div>
          <div className="gm-cards">
            {state.phase.offers.map((key, i) => {
              const on = state.phase.kind === 'drafting' && state.phase.selected === i;
              return (
                <button
                  key={`${key}-${i}`}
                  type="button"
                  onClick={() => run.dispatch({ type: 'selectOffer', index: i })}
                  aria-pressed={on}
                  className={`gm-card${on ? ' is-selected' : ''}`}
                >
                  {/* The sheet puts a badge top-right. Its own badge is a cost,
                      which does not exist here, so this carries the part's real
                      effect badge instead: +3, ×2. Same position, real data. */}
                  <span aria-hidden className={`gm-card-badge${on ? ' is-check' : ''}`}>
                    {on ? <img src={ICON_ART.success} alt="" aria-hidden className="gm-icon-xs" width={32} height={32} /> : PARTS[key].badge}
                  </span>
                  {hasPixelArt(key)
                    ? <PixelPart part={key} size="32px" />
                    : <Icon name={PARTS[key].glyph as IconName} size={30} />}
                  <b className="gm-card-name">{PARTS[key].name}</b>
                  <span className="gm-card-rule">{PARTS[key].rule}</span>
                </button>
              );
            })}
          </div>
          <p className="gm-note gm-center">Pick a card, then tap an empty cell.</p>
        </section>
      )}

      {state.phase.kind === 'blueprint' && (
        <section className="gm-draft">
          <h2 className="gm-draft-title gm-blue gm-panel">A blueprint surfaces</h2>
          <div className="gm-cards">
            {state.phase.offers.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => run.dispatch({ type: 'takeBlueprint', key })}
                className="gm-card is-blueprint"
              >
                <Icon name={BLUEPRINTS[key].glyph as IconName} size={30} className="gm-blue" />
                <b className="gm-card-name">{BLUEPRINTS[key].name}</b>
                <span className="gm-card-rule">{BLUEPRINTS[key].rule}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {playback.breakdown.length > 0 && (
        <section className="gm-readout">
          <span className="gm-label">Last drop</span>
          <div className="gm-readout-lines">
            {playback.breakdown.map((line, i) => <span key={i}>{line}</span>)}
          </div>
        </section>
      )}

      <footer className="gm-footer">
        <span>Payload · Game</span>
        <span className="gm-version">v{__APP_VERSION__}</span>
        <a href="/">Arcade</a>
      </footer>

      <p role="status" aria-live="polite" className="sr-only">{playback.announcement}</p>
    </div>
  );
}
