import { memo } from 'react';
import type { CSSProperties } from 'react';
import { PARTS } from '../game/content.js';
import { isForked } from '../game/simulate.js';
import { COLS, ROWS, cellAt, cellIndex, colOf, rowOf } from '../game/types.js';
import type { Board as BoardModel, CellIndex, PartKey } from '../game/types.js';
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
  readonly movable: boolean;
  readonly firing: boolean;
  readonly onPress: (cell: CellIndex) => void;
}

/**
 * Memoised so a drop animating through one column doesn't re-render the other
 * twenty-five cells. Identity is the cell index, which never changes.
 */
const Cell = memo(function Cell({
  index, part, row, col, forked, placeable, movable, firing, onPress,
}: CellProps) {
  const where = `Row ${row + 1}, column ${col + 1}`;
  const affordance = movable
    ? part ? ', press to pick this part up' : ', press to move the part here'
    : placeable ? ', press to install the selected part' : '';
  const label = part
    ? `${where}: ${PARTS[part].name}. ${PARTS[part].rule}${forked ? ' Doubled by an adjacent Tuning Fork.' : ''}${affordance}`
    : `${where}: empty${affordance}`;

  return (
    <button
      type="button"
      aria-label={label}
      onClick={() => onPress(index)}
      className={[
        'aspect-square rounded-[9px] flex flex-col items-center justify-center gap-0 p-0',
        'focus-visible:outline focus-visible:outline-2 focus-visible:outline-ink focus-visible:outline-offset-2',
        part
          ? 'bg-card border border-edge'
          : 'bg-[#191c22] border border-dashed border-edge-soft',
        placeable ? 'border-[1.5px] border-dashed border-brass bg-brass/[0.06] cursor-pointer' : '',
        movable ? 'border-[1.5px] border-dashed border-glow bg-glow/[0.08] cursor-pointer' : '',
        forked ? 'shadow-[inset_0_0_0_1.5px_rgba(111,211,217,.5)]' : '',
        firing ? 'animate-fire' : '',
      ].join(' ')}
    >
      {part && (
        <>
          <span aria-hidden className="text-[19px] leading-[1.1]">{PARTS[part].glyph}</span>
          <span
            aria-hidden
            className={`text-[9.5px] font-bold tracking-[.02em] ${
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
  readonly firingCell: CellIndex | null;
  /** Increments on every flash. Part of the firing cell's key so a Spring
   *  landing on the same cell twice replays the animation; toggling a class
   *  back on within one paint does not restart a CSS animation. */
  readonly firingSeq: number;
  /** Marbles currently in flight. Empty outside a drop, and empty for the
   *  whole drop when motion is reduced or the player skipped it. */
  readonly marbles: readonly MarbleView[];
  readonly labels: readonly FloatLabel[];
  /** Cells the player may pick up, while Loose Screws is being used. */
  readonly movable: ReadonlySet<CellIndex>;
  readonly onCellPress: (cell: CellIndex) => void;
}

export function Board({
  board, placeable, firingCell, firingSeq, marbles, labels, movable, onCellPress,
}: BoardProps) {
  const cells = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const index = cellAt(r, c);
      const part = board[index] ?? null;
      const firing = firingCell === index;
      cells.push(
        <Cell
          key={firing ? `${index}-${firingSeq}` : index}
          index={index}
          part={part}
          row={r}
          col={c}
          forked={part ? isForked(board, index) : false}
          placeable={placeable && part === null}
          movable={movable.has(index)}
          firing={firing}
          onPress={onCellPress}
        />,
      );
    }
  }

  return (
    <div className="relative bg-panel border border-edge rounded-[13px] p-2">
      <div className="grid grid-cols-5 gap-1.5">{cells}</div>

      {/* inset-2 matches the panel's p-2, so the overlay's box is exactly the
          grid's box and cellBox arithmetic lines up with the real cells. */}
      <div aria-hidden className="absolute inset-2 pointer-events-none">
        {marbles.map((m) => (
          <div
            key={m.id}
            style={cellBox(m.cell)}
            className="absolute flex items-center justify-center transition-[left,top] duration-[90ms] ease-linear"
          >
            <span className="w-[64%] aspect-square rounded-full flex items-center justify-center text-[10px] font-bold text-[#2b1e06] tabular-nums bg-[radial-gradient(circle_at_32%_27%,#fff4d8,#e0ae4d_48%,#8d6119)] shadow-[0_0_9px_rgba(217,164,65,.5)]">
              {m.value}
            </span>
          </div>
        ))}
        {labels.map((l) => (
          <div
            key={l.id}
            style={cellBox(l.cell)}
            className="absolute flex items-start justify-center"
          >
            <span className={`animate-floatup font-bold text-[12px] drop-shadow-[0_1px_2px_rgba(0,0,0,.8)] ${l.tone}`}>
              {l.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export { cellIndex };
