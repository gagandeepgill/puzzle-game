import type { PartKey } from '../../game/types.js';

/**
 * The pixel skin's sprites.
 *
 * Authored at 32x32 and scaled only in CSS with `image-rendering: pixelated`,
 * so a cell that measures 55.6px on a phone and 90px on a monitor shows the
 * same crisp sprite at a different size rather than a resampled one.
 *
 * ## The pack is incomplete, and this is where that is handled
 *
 * The engine has ten parts. The supplied pack contains six sprites: bell,
 * coil, gate, prism, spring and wire. `weight`, `anvil`, `reso` and `fork`
 * have no art.
 *
 * Rather than invent four sprites or ship four empty cells, a part with no
 * sprite falls back to the SVG glyph the classic skin already uses. That is
 * visibly a mix, which is the honest state of the pack and better than a board
 * with holes in it. Dropping the four PNGs into `public/assets/pixel/parts/`
 * and adding their keys below is the whole of the remaining work.
 */
export const PIXEL_PARTS = new Set<PartKey>([
  'bell', 'coil', 'gate', 'prism', 'spring', 'wire',
]);

/** True when this part has real pixel art and does not need the SVG fallback. */
export const hasPixelArt = (part: PartKey): boolean => PIXEL_PARTS.has(part);

const BASE = '/assets/pixel';

interface PartProps {
  readonly part: PartKey;
  /** Rendered edge length. Defaults to the board's `--glyph`. */
  readonly size?: string;
  /** The part is firing this frame. */
  readonly active?: boolean;
}

/**
 * Always `aria-hidden`. The cell button carries the accessible name, which
 * already includes the part's name and rule, so announcing the image too would
 * say everything twice.
 */
export function PixelPart({ part, size, active = false }: PartProps) {
  return (
    <img
      src={`${BASE}/parts/${part}.png`}
      alt=""
      aria-hidden
      draggable={false}
      width={32}
      height={32}
      /* The part key drives which activation effect plays. CSS selects on it
         rather than the component branching, so adding an effect is one
         keyframe block and no TypeScript. */
      data-part={part}
      className={`px-sprite${active ? ' px-activate' : ''}`}
      style={{ width: size ?? 'var(--glyph)', height: size ?? 'var(--glyph)' }}
    />
  );
}

/**
 * The marble in flight.
 *
 * Sized as a share of the cell to match the classic skin's 64%, so swapping
 * skins does not move the marble relative to the board. Position and timing
 * stay entirely with the playback code; this is the visual only.
 */
export function PixelMarble({ label }: { readonly label: number }) {
  return (
    <span className="px-marble" style={{ width: '64%' }}>
      <img
        src={`${BASE}/marbles/marble-blue.png`}
        alt=""
        aria-hidden
        draggable={false}
        width={32}
        height={32}
        className="px-sprite px-marble-img"
      />
      <span className="px-marble-value" style={{ fontSize: 'var(--badge)' }}>
        {label}
      </span>
    </span>
  );
}
