import { memo } from 'react';
import type { CSSProperties } from 'react';
import { PARTS } from '../game/content.js';
import { isForked } from '../game/simulate.js';
import { COLS, ROWS, cellAt, cellIndex, colOf, rowOf } from '../game/types.js';
import type { Board as BoardModel, CellIndex, PartKey } from '../game/types.js';
import type { HeatTier } from '../game/preview.js';
import { Icon } from './icons.js';
import { PixelMarble, PixelPart, hasPixelArt } from './pixel/PixelSprite.js';
import type { IconName } from './icons.js';
import type { FloatLabel, MarbleView } from './usePayloadRun.js';

/** Matches `gap-1.5` on the grid below. The overlay is positioned by
 *  arithmetic rather than by the grid itself, because a grid item cannot
 *  transition between cells — and watching the marble travel is the point. */
const GAP = 6;

function cellBox(cell: CellIndex): CSSProperties {
  const r = rowOf(cell);
  const c = colOf(cell);
  const w = `calc((100% - ${(COLS - 1) * GAP}px) / ${COLS})`;
  const h = `calc((100% - ${(ROWS - 1) * GAP}px) / ${ROWS})`;
  return {
    width: w,
    height: h,
    left: `calc(${w} * ${c} + ${GAP * c}px)`,
    top: `calc(${h} * ${r} + ${GAP * r}px)`,
  };
}

interface CellProps {
  readonly index: CellIndex;
  readonly part: PartKey | null;
  readonly row: number;
  readonly col: number;
  readonly forked: boolean;
  readonly placeable: boolean;
  /** How much this cell would improve the machine, if the player is holding a
   *  part. Null when nothing is selected. */
  readonly heat: HeatTier | null;
  /** A Tuning Fork already reaches here, so whatever lands would be doubled. */
  readonly wouldFork: boolean;
  /** Position in the previewed fall path, 1-based. 0 when not on it. */
  readonly step: number;
  readonly movable: boolean;
  readonly firing: boolean;
  /** Draw the pixel skin's sprites instead of the SVG glyphs. Presentation
   *  only: nothing about the cell's behaviour or accessible name changes. */
  readonly pixel: boolean;
  readonly onPress: (cell: CellIndex) => void;
}

/**
 * Memoised so a drop animating through one column doesn't re-render the other
 * twenty-five cells. Identity is the cell index, which never changes.
 */
const Cell = memo(function Cell({
  index, part, row, col, forked, placeable, heat, wouldFork, step, movable, firing, pixel, onPress,
}: CellProps) {
  const where = `Row ${row + 1}, column ${col + 1}`;
  const affordance = movable
    ? part ? ', press to pick this part up' : ', press to move the part here'
    : placeable ? ', press to install the selected part' : '';
  // The preview has to be in the name too. A heat colour a screen reader
  // cannot see would make the board less usable, not more.
  const heatWord = heat === 'best' ? '. Best placement'
    : heat === 'strong' ? '. Strong placement'
    : heat === 'fair' ? '. Slight gain'
    : heat === 'flat' ? '. No gain here' : '';
  const forkWord = wouldFork ? '. A Tuning Fork reaches here, so this part would be doubled' : '';
  const stepWord = step > 0 ? `. Step ${step} of the marble's path` : '';
  const label = part
    ? `${where}: ${PARTS[part].name}. ${PARTS[part].rule}${forked ? ' Doubled by an adjacent Tuning Fork.' : ''}${stepWord}${affordance}`
    : `${where}: empty${heatWord}${forkWord}${stepWord}${affordance}`;

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => onPress(index)}
      className={[
        'aspect-square rounded-[9px] flex flex-col items-center justify-center gap-0 p-0',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2',
        // A part sits proud of the board and catches the light; an empty
        // cell is a recess cut into it. That difference is most of what makes
        // the board read as a machine rather than a grid of rectangles.
        part
          ? 'bg-machined border border-edge shadow-machined'
          : 'bg-ground border border-dashed border-edge shadow-recess',
        pixel && part ? 'px-filled' : '',
        placeable ? 'border-[1.5px] border-dashed border-brass cursor-pointer' : '',
        // Shaded by what the part would actually be worth here, from the same
        // simulation the drop runs. Flat cells stay dim rather than going red:
        // most cells are flat, and a board of warnings reads as noise.
        // ring, not a second shadow: Tailwind composes ring with shadow via
        // separate CSS variables, but two arbitrary shadow-[...] classes
        // overwrite each other — so a cell that is both the best placement and
        // fork-reached would have lost one of the two indicators.
        placeable && heat === 'best' ? 'bg-brass/30 border-brass ring-2 ring-brass' : '',
        placeable && heat === 'strong' ? 'bg-brass/[0.17]' : '',
        placeable && heat === 'fair' ? 'bg-brass/[0.07]' : '',
        placeable && heat === 'flat' ? 'opacity-55' : '',
        wouldFork ? 'shadow-[inset_0_0_0_1.5px_rgba(111,211,217,.55)]' : '',
        step > 0 ? 'ring-1 ring-glow/70' : '',
        movable ? 'border-[1.5px] border-dashed border-glow bg-glow/[0.08] cursor-pointer' : '',
        forked ? 'shadow-[inset_0_0_0_1.5px_rgba(111,211,217,.5)]' : '',
        firing ? 'animate-fire' : '',
      ].join(' ')}
    >
      {step > 0 && !part && (
        <span aria-hidden style={{ fontSize: 'var(--badge)' }}
            className="font-bold text-glow/80 tabular-nums">{step}</span>
      )}
      {part && (
        <>
          <span
            className="shrink-0"
            style={{ width: 'var(--glyph)', height: 'var(--glyph)' }}
          >
            {/* Four of the ten parts have no sprite in the supplied pack, so
                they keep the SVG glyph rather than rendering an empty cell. */}
            {pixel && hasPixelArt(part)
              ? <PixelPart part={part} active={firing} />
              : <Icon name={PARTS[part].glyph as IconName} size={undefined} className="w-full h-full" />}
          </span>
          <span
            aria-hidden
            style={{ fontSize: 'var(--badge)' }}
            className={`font-bold tracking-[.02em] ${
              PARTS[part].role === 'multiply' ? 'text-brass' : 'text-steel'
            }`}
          >
            {PARTS[part].badge}
          </span>
        </>
      )}
    </button>
  );
});

interface BoardProps {
  readonly board: BoardModel;
  readonly placeable: boolean;
  readonly firingCells: readonly CellIndex[];
  /** Increments on every flash. Part of the firing cell's key so a Spring
   *  landing on the same cell twice replays the animation; toggling a class
   *  back on within one paint does not restart a CSS animation. */
  readonly firingSeq: number;
  /** The current frame's dwell. The marble's transition is derived from it so
   *  travel always finishes inside the frame, however fast the fall gets. */
  readonly stepMs: number;
  /** Marbles currently in flight. Empty outside a drop, and empty for the
   *  whole drop when motion is reduced or the player skipped it. */
  readonly marbles: readonly MarbleView[];
  readonly labels: readonly FloatLabel[];
  /** Cells the player may pick up, while Loose Screws is being used. */
  readonly movable: ReadonlySet<CellIndex>;
  /** Per-cell rating for the part being placed. Empty when none is selected. */
  readonly heat: ReadonlyMap<CellIndex, HeatTier>;
  /** Cells an existing Tuning Fork already reaches. */
  readonly forkReach: ReadonlySet<CellIndex>;
  /** Cells the marble would enter, in order, for the previewed column. */
  readonly path: readonly CellIndex[];
  readonly onCellPress: (cell: CellIndex) => void;
  /** True when the pixel skin is selected. */
  readonly pixel: boolean;
}

export function Board({
  board, placeable, firingCells, firingSeq, stepMs, marbles, labels, movable,
  heat, forkReach, path, pixel, onCellPress,
}: BoardProps) {
  const cells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const index = cellAt(r, c);
      const part = board[index] ?? null;
      const firing = firingCells.includes(index);
      cells.push(
        <Cell
          key={firing ? `${index}-${firingSeq}` : index}
          index={index}
          part={part}
          row={r}
          col={c}
          forked={part ? isForked(board, index) : false}
          placeable={placeable && part === null}
          heat={placeable && part === null ? heat.get(index) ?? null : null}
          wouldFork={placeable && part === null && forkReach.has(index)}
          step={path.indexOf(index) + 1}
          movable={movable.has(index)}
          firing={firing}
          pixel={pixel}
          onPress={onCellPress}
        />,
      );
    }
  }

  return (
    <div className="relative bg-panel-lit border border-edge rounded-[13px] shadow-panel p-2">
      <div className="grid grid-cols-5 gap-1.5">{cells}</div>

      {/* inset-2 matches the panel's p-2, so the overlay's box is exactly the
          grid's box and cellBox arithmetic lines up with the real cells. */}
      <div aria-hidden className="absolute inset-2 pointer-events-none">
        {marbles.map((m) => (
          <div
            key={m.id}
            /* Always a little under the frame's dwell, so travel finishes
               before the next position is written. It was a hardcoded 90ms
               against a 60ms frame, which meant the transition was retargeted
               before it finished and the marble never landed on a cell at all.
               Now the fall accelerates, so this has to track it. */
            style={{ ...cellBox(m.cell), transitionDuration: `${Math.max(30, stepMs - 8)}ms` }}
            className="absolute flex items-center justify-center transition-[left,top] ease-linear"
          >
            {/* Same 64% of the cell either way, so switching skin does not
                move the marble relative to the board. Position and timing are
                untouched: both are still whatever playback wrote. */}
            {pixel ? <PixelMarble label={m.value} /> : (
              <span
                /* Sized from the cell, like the part badges. It was a fixed
                   10px, which is legible in a 55px phone cell and lost inside a
                   90px one on a monitor. */
                style={{ fontSize: 'var(--badge)' }}
                className="relative w-[64%] aspect-square rounded-full flex items-center justify-center font-bold text-[#2b1e06] tabular-nums shadow-marble bg-[radial-gradient(circle_at_34%_26%,#fffaf0_0%,#f4d08a_14%,#d9a441_44%,#9c7025_72%,#5e410f_100%)]"
              >
                {/* The specular dot is its own element so it can be blurred
                    without softening the value sitting on top of it. */}
                <span
                  aria-hidden
                  className="absolute left-[22%] top-[16%] w-[26%] h-[22%] rounded-full bg-white/70 blur-[2px]"
                />
                <span className="relative">{m.value}</span>
              </span>
            )}
          </div>
        ))}
        {labels.map((l) => (
          <div
            key={l.id}
            style={cellBox(l.cell)}
            className="absolute flex items-start justify-center"
          >
            <span className={`animate-floatup font-bold text-body drop-shadow-[0_1px_2px_rgba(0,0,0,.8)] ${l.tone}`}>
              {l.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { cellIndex };
