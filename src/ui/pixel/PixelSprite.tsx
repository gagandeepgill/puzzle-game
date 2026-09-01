import type { PartKey } from '../../game/types.js';

/**
 * The pixel skin's sprites.
 *
 * Authored at 32x32 and scaled only in CSS with `image-rendering: pixelated`,
 * so a cell that measures 55.6px on a phone and 90px on a monitor shows the
 * same crisp sprite at a different size rather than a resampled one.
 *
 * All ten are 32x32 PNG with alpha, delivered as individual files. They
 * replace an earlier pack that arrived in two halves and two formats, which
 * is why `PART_SPRITE` below used to be an explicit map of mixed extensions.
 */
const BASE = '/assets/pixel';

/**
 * Every part's sprite file.
 *
 * Still written out rather than derived as `${part}.png`, so the set is
 * legible in one place and a part added to the game without art fails
 * typecheck rather than 404ing at runtime.
 *
 * The `hasPixelArt` fallback to the SVG glyph stays, because a missing file
 * should degrade to a readable board rather than to an empty cell, and a test
 * asserts this map against the filesystem in both directions.
 */
export const PART_SPRITE: Record<PartKey, string> = {
  weight: `${BASE}/parts/weight.png`,
  anvil: `${BASE}/parts/anvil.png`,
  reso: `${BASE}/parts/reso.png`,
  fork: `${BASE}/parts/fork.png`,
  coil: `${BASE}/parts/coil.png`,
  prism: `${BASE}/parts/prism.png`,
  spring: `${BASE}/parts/spring.png`,
  wire: `${BASE}/parts/wire.png`,
  gate: `${BASE}/parts/gate.png`,
  bell: `${BASE}/parts/bell.png`,
};

/** The interface sprites, which are not parts. All 32x32 PNG with alpha. */
export const UI_SPRITE = {
  jam: `${BASE}/ui/jam.png`,
  blueprints: `${BASE}/ui/blueprints.png`,
  settings: `${BASE}/ui/settings.png`,
  soundOn: `${BASE}/ui/sound-on.png`,
  soundOff: `${BASE}/ui/sound-off.png`,
} as const;

/**
 * The marble, in its four tints.
 *
 * All four share a silhouette and an upper-left highlight on purpose, so a
 * tint reads as the same object in a different state rather than as a
 * different object.
 */
export const MARBLE_SPRITE = {
  silver: `${BASE}/marbles/marble-silver.png`,
  blue: `${BASE}/marbles/marble-blue.png`,
  red: `${BASE}/marbles/marble-red.png`,
  dim: `${BASE}/marbles/marble-dim.png`,
} as const;

export const PIXEL_PARTS = new Set<PartKey>(Object.keys(PART_SPRITE) as PartKey[]);

/** True when this part has real pixel art and does not need the SVG fallback. */
export const hasPixelArt = (part: PartKey): boolean => PIXEL_PARTS.has(part);

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
      src={PART_SPRITE[part]}
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
        src={MARBLE_SPRITE.blue}
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
