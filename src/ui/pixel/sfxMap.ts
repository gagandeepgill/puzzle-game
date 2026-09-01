/**
 * The pixel sound map and its mix.
 *
 * Paths and volumes are transcribed from the sound spec rather than chosen
 * here, so a change to the mix is a change to one table and comparing it back
 * against the document is a diff.
 *
 * No `.wav` has been supplied yet. `sampleBank.ts` treats a missing file as a
 * normal outcome and `pixelSfx.ts` synthesises that cue instead, so the game
 * sounds complete today and upgrades file by file as recordings land. Nothing
 * needs rewiring when they do.
 */

export const PIXEL_SFX = {
  marbleDrop: '/assets/audio/pixel/gameplay/marble-drop.wav',
  marbleMove: '/assets/audio/pixel/gameplay/marble-move.wav',
  marbleLand: '/assets/audio/pixel/gameplay/marble-land.wav',

  weight: '/assets/audio/pixel/parts/weight.wav',
  anvil: '/assets/audio/pixel/parts/anvil.wav',
  coil: '/assets/audio/pixel/parts/coil.wav',
  prism: '/assets/audio/pixel/parts/prism.wav',
  spring: '/assets/audio/pixel/parts/spring.wav',
  wire: '/assets/audio/pixel/parts/wire.wav',
  reso: '/assets/audio/pixel/parts/reso.wav',
  fork: '/assets/audio/pixel/parts/fork.wav',

  gatePass: '/assets/audio/pixel/parts/gate-pass.wav',
  gateFail: '/assets/audio/pixel/parts/gate-fail.wav',

  bell: '/assets/audio/pixel/parts/bell.wav',

  scoreSmall: '/assets/audio/pixel/gameplay/score-small.wav',
  scoreMedium: '/assets/audio/pixel/gameplay/score-medium.wav',
  scoreBig: '/assets/audio/pixel/gameplay/score-big.wav',
  quotaClear: '/assets/audio/pixel/gameplay/quota-clear.wav',

  hover: '/assets/audio/pixel/ui/hover.wav',
  click: '/assets/audio/pixel/ui/click.wav',
  select: '/assets/audio/pixel/ui/select.wav',
  place: '/assets/audio/pixel/ui/place.wav',
  draftOpen: '/assets/audio/pixel/ui/draft-open.wav',
  blueprint: '/assets/audio/pixel/ui/blueprint.wav',
  error: '/assets/audio/pixel/ui/error.wav',

  jam: '/assets/audio/pixel/events/jam-warning.wav',
  roundStart: '/assets/audio/pixel/events/round-start.wav',
  roundClear: '/assets/audio/pixel/events/round-clear.wav',
  win: '/assets/audio/pixel/events/game-win.wav',
  gameOver: '/assets/audio/pixel/events/game-over.wav',
} as const;

export type SfxName = keyof typeof PIXEL_SFX;

/**
 * The mix, straight from the spec's table.
 *
 * The hierarchy it encodes is the point, and `sfxMap.test.ts` asserts it
 * rather than trusting these numbers to stay in order:
 * UI, marble, parts, big activation and score, jam and quota, round clear,
 * game win.
 */
export const PIXEL_VOLUME = {
  hover: 0.18,
  ui: 0.30,

  marble: 0.40,

  wire: 0.42,
  part: 0.55,
  anvil: 0.60,

  scoreSmall: 0.32,
  scoreMedium: 0.42,
  scoreBig: 0.52,

  jam: 0.62,
  event: 0.68,

  roundClear: 0.72,
  win: 0.78,
  gameOver: 0.68,
} as const;

/** Which band each cue is mixed at. */
export const VOLUME_FOR: Record<SfxName, keyof typeof PIXEL_VOLUME> = {
  marbleDrop: 'marble', marbleMove: 'marble', marbleLand: 'marble',
  weight: 'part', anvil: 'anvil', coil: 'part', prism: 'part', spring: 'part',
  wire: 'wire', reso: 'part', fork: 'part',
  gatePass: 'part', gateFail: 'part', bell: 'part',
  scoreSmall: 'scoreSmall', scoreMedium: 'scoreMedium', scoreBig: 'scoreBig',
  quotaClear: 'event',
  hover: 'hover', click: 'ui', select: 'ui', place: 'ui', draftOpen: 'ui',
  blueprint: 'event', error: 'ui',
  jam: 'jam', roundStart: 'ui', roundClear: 'roundClear',
  win: 'win', gameOver: 'gameOver',
};

/**
 * Cues that must sound identical every time.
 *
 * The spec is explicit: these carry meaning the player learns to recognise,
 * and a pitch-shifted victory phrase stops being the victory phrase. Every
 * other cue gets the +/-4% it asks for.
 */
export const NO_PITCH_VARIATION: ReadonlySet<SfxName> = new Set<SfxName>([
  'jam', 'quotaClear', 'roundClear', 'win', 'gameOver',
]);

/**
 * Loaded before the first drop, so a part activation never waits on a fetch.
 *
 * The spec's list: marble, every part, gate, bell, select, place and the two
 * common score pips. The long event sounds are fetched when idle instead,
 * since none of them can fire in the first seconds of a run.
 */
export const PRELOAD: readonly SfxName[] = [
  'marbleDrop', 'marbleMove', 'marbleLand',
  'weight', 'anvil', 'coil', 'prism', 'spring', 'wire', 'reso', 'fork',
  'gatePass', 'gateFail', 'bell',
  'select', 'place', 'scoreSmall', 'scoreMedium',
];

/** Fetched during idle time. Nothing here can fire in the first few seconds. */
export const DEFERRED: readonly SfxName[] = [
  'scoreBig', 'quotaClear', 'jam', 'roundStart', 'roundClear', 'win',
  'gameOver', 'blueprint', 'draftOpen', 'hover', 'click', 'error',
];
