import { memo } from 'react';
import { PARTS } from '../game/content.js';
import { isForked } from '../game/simulate.js';
import { COLS, ROWS, cellAt, cellIndex } from '../game/types.js';
import type { Board as BoardModel, CellIndex, PartKey } from '../game/types.js';

interface CellProps {
  readonly index: CellIndex;
  readonly part: PartKey | null;
  readonly row: number;
  readonly col: number;
  readonly forked: boolean;
  readonly placeable: boolean;
  readonly firing: boolean;
  readonly onPress: (cell: CellIndex) => void;
}

/**
 * Memoised so a drop animating through one column doesn't re-render the other
 * twenty-five cells. Identity is the cell index, which never changes.
 */
const Cell = memo(function Cell({
  index, part, row, col, forked, placeable, firing, onPress,
}: CellProps) {
  const where = `Row ${row + 1}, column ${col + 1}`;
  const label = part
    ? `${where}: ${PARTS[part].name}. ${PARTS[part].rule}${forked ? ' Doubled by an adjacent Tuning Fork.' : ''}`
    : `${where}: empty${placeable ? ', press to install the selected part' : ''}`;

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
  readonly onCellPress: (cell: CellIndex) => void;
}

export function Board({ board, placeable, firingCell, firingSeq, onCellPress }: BoardProps) {
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
          firing={firing}
          onPress={onCellPress}
        />,
      );
    }
  }

  return (
    <div className="relative bg-panel border border-edge rounded-[13px] p-2">
      <div className="grid grid-cols-5 gap-1.5">{cells}</div>
    </div>
  );
}

export { cellIndex };
