/**
 * Pixel motion timings, in one place.
 *
 * The spec asks for reusable constants rather than magic numbers scattered
 * through keyframes, so this is the source and `shell.css` / `pixel.css`
 * mirror it as `--px-t-*` custom properties. CSS cannot import a TypeScript
 * value, so `motion.test.ts` asserts the two agree rather than trusting them
 * to be kept in step by hand — the same approach the cockpit breakpoint uses
 * for the number it has to repeat in four files.
 *
 * Tune here first, then update the matching custom property; the test names
 * whichever one you forgot.
 */
export const PIXEL_MOTION = {
  /** Hover, press, select. */
  ui: 120,
  /** One board step for a falling marble. */
  marbleStep: 155,
  /** A floating +3 or ×2 rising from the cell that produced it. */
  scorePop: 300,

  weight: 150,
  anvil: 220,
  coil: 180,
  prism: 260,
  spring: 260,
  wire: 110,
  reso: 300,
  fork: 300,
  gate: 220,
  bell: 350,

  jamIntro: 600,
  roundClear: 750,
  gameResult: 900,
} as const;

export type MotionKey = keyof typeof PIXEL_MOTION;

/**
 * Which CSS custom property mirrors each constant.
 *
 * Only the ones CSS actually reads. `marbleStep` is applied by the playback
 * hook in JavaScript rather than by a stylesheet, so it has no twin here and
 * is checked against the pacing curve instead.
 */
export const MOTION_VAR: Partial<Record<MotionKey, string>> = {
  weight: '--px-t-weight',
  anvil: '--px-t-anvil',
  coil: '--px-t-coil',
  prism: '--px-t-prism',
  spring: '--px-t-spring',
  wire: '--px-t-wire',
  reso: '--px-t-reso',
  fork: '--px-t-fork',
  gate: '--px-t-gate',
  bell: '--px-t-bell',
  scorePop: '--px-t-score',
  jamIntro: '--px-t-jam',
};
