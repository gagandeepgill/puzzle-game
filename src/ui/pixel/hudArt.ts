/**
 * The HUD art the `game` skin draws with.
 *
 * The pack arrived as eight 1448x1086 sprite sheets, 6.7MB of them. Those are
 * sources, not assets: they live in `public/assets/pixel/hud-sources/` and are not
 * copied into the build. What ships is the pieces actually referenced here,
 * cropped out of them and quantised, which is 188KB.
 *
 * Every crop was measured rather than eyeballed, by finding the bounding box
 * of each opaque blob in the sheet. The rectangle is recorded beside each
 * path so a re-crop does not start from guesswork, as `x,y wxh` in the source
 * sheet's own pixels.
 *
 * Paths are absolute so they resolve the same from `/app/` and from the hub.
 */

const BASE = '/assets/pixel/hud';

/**
 * The board's metal frame, as a 9-slice.
 *
 * Composed rather than cropped: the tileset draws one corner and one straight
 * bar, and this is those two pieces mirrored into the eight edge and corner
 * slices of a 144x144 image with a hollow centre. `border-image` then draws
 * the frame at any board size, which is what the mockups show around the
 * grid and what CSS corner brackets were standing in for.
 *
 * Two source rectangles, both in retro_sci_fi_board_tileset_sprites:
 * the corner at 53,118 324x334 and the bar at 454,206 696x98.
 */
export const BOARD_FRAME = `${BASE}/frames/board-frame.png`;

/**
 * The core HUD frames, one per panel, each at the inset the art was drawn to.
 *
 * These were given with the batch rather than measured off the corner art,
 * which is what every earlier frame in this skin needed. The generic
 * `PANEL_ART` stays for panels with no frame of their own.
 *
 * The track and the fill are the same 112x12 art. The fill is clipped by
 * width rather than resized, so its texture reads at its drawn scale whatever
 * the panel is, and the width comes from the run.
 */
export const CORE_ART = {
  header: `${BASE}/core/header-frame.png`,
  round: `${BASE}/core/round-frame.png`,
  score: `${BASE}/core/score-frame.png`,
  quota: `${BASE}/core/quota-panel.png`,
  quotaTrack: `${BASE}/core/quota-track.png`,
  quotaFill: `${BASE}/core/quota-fill.png`,
  drops: `${BASE}/core/drops-panel.png`,
  dropActive: `${BASE}/core/drop-active.png`,
  dropEmpty: `${BASE}/core/drop-empty.png`,
  banked: `${BASE}/core/banked-panel.png`,
  bankedIcon: `${BASE}/core/banked-icon.png`,
  jam: `${BASE}/core/jam-panel.png`,
  blueprints: `${BASE}/core/blueprints-panel.png`,
  draftHeader: `${BASE}/core/draft-header-frame.png`,
  support: `${BASE}/core/support-panel.png`,
} as const;

/** The divider under a section title. */
export const DIVIDER_ART = `${BASE}/panels/divider.png`;

/**
 * The HUD panel frame, as a 9-slice.
 *
 * Corner brackets and a status lamp. The slice is 20px rather than something
 * smaller for one reason: the lamp sits 20px in from the right edge, so a
 * narrower slice would drop it into the repeating top edge and tile lamps
 * across every panel. At 20 it falls inside the top-right corner, which does
 * not repeat, and each panel gets exactly one.
 *
 * Quartered from the source so a 20px slice renders at a 10px border.
 *
 * pixel_art_sci_fi_hud_panel_set: 925,35 461x376.
 */
export const PANEL_ART = `${BASE}/frames/panel-frame.png`;

/**
 * HUD icons.
 *
 * One icon, not five. Jam, blueprints and settings were cropped from the neon
 * sheet and have since been delivered as individual 32x32 files, so they come
 * from `UI_SPRITE` now and their crops are gone. The check has no delivered
 * twin, so it stays here.
 */
export const ICON_ART = {
  /** The selected card's tick, and the armed reset's warning. */
  success: `${BASE}/icons/success-badge.png`,
  warning: `${BASE}/icons/warning.png`,
  headerCorner: `${BASE}/icons/header-corner.png`,
} as const;

/**
 * The effect frames.
 *
 * Six per effect, 64x64, delivered as individual files and played by swapping
 * `background-image` at six discrete steps. An earlier pass composed strips
 * out of the FX atlas — its rows have frames at different sizes and uneven
 * gaps, so each had to be recut on its own centre before a `steps()` walk
 * could read them. The delivered frames are already aligned and centred, so
 * the composed strips are gone.
 *
 * Listed here so the shipped-set test sees them; the URLs themselves are
 * written out in the keyframes, which is the only place that can name six.
 */
export const FX_FRAME_COUNT = 6;
export const FX_EFFECTS = ['spring', 'bell', 'jam'] as const;

/**
 * Placement states, on the cell being aimed at.
 *
 * The pack draws these three and CSS cannot draw a crosshair, so they are art.
 * Only the aimed cell takes one. An earlier pass tiled the whole board with
 * the matching idle stone tile and thirty of them shouted over every part; one
 * cell at a time is a targeting reticle, which is what they are drawn as.
 *
 * The idle tile is deliberately still absent — a resting cell is flat, which
 * is how the mockups draw the board.
 *
 * retro_sci_fi_board_tileset_sprites: valid 386,521 323x333,
 * invalid 739,521 327x333, focus 1091,518 333x340.
 */
export const CELL_ART = {
  valid: `${BASE}/board/valid-placement.png`,
  invalid: `${BASE}/board/invalid-placement.png`,
} as const;

/**
 * The one button frame, and the effects that play over a cell.
 *
 * Only the score pop is left. `hit`, `spark` and `pulse` were single frames
 * standing in for parts with no sequence, and every part in the game has one
 * now — the last of them, Spring, on its second delivery. A part added later
 * without frames falls back to the shared CSS motion in `pixel.css` rather
 * than to a stand-in nothing else uses.
 */
export const BUTTON_FRAME = `${BASE}/frames/button-frame.png`;
export const CARD_FRAME = `${BASE}/frames/card-frame.png`;
export const EFFECT_ART = {
  scorePop: `${BASE}/effects/score-pop-fx.png`,
} as const;

/**
 * The delivered activation sequences, by part.
 *
 * Frame files live under `/assets/pixel/effects/` and are named by the keys
 * here. The URLs are written out in the keyframes, which is the only place
 * that can name four or six of them; this is the manifest, so a part that
 * loses its frames is visible from one place.
 *
 * Gate has two, chosen by the outcome the engine already decided: a rejected
 * marble marks its cell `px-seized`, which only a gate ever does.
 *
 * Every part has one. Spring took two deliveries: the first arrived with two
 * of its six overwritten by the cell tiles from the same download, which is
 * the collision `partFrames.test.ts` now checks for by hashing every frame
 * against both tiles.
 */
export const PART_FRAMES: Record<string, number> = {
  weight: 4, anvil: 4, coil: 4, prism: 6, spring: 6, wire: 4, reso: 4, fork: 4,
  bell: 6, 'gate-pass': 4, 'gate-fail': 4,
};

/*
 * Idle board cells are not here on purpose.
 *
 * An earlier pass tiled them with the cracked stone sprites out of
 * `retro_sci_fi_board_tileset_sprites.png`, the blob at x=31 y=522 and the
 * three states beside it. That was the wrong asset. Both the layout mockups and the
 * reference sheet's own CELL & FX row draw a board cell flat: a dark well with
 * a thin light edge, so the part sprite in it is the thing you look at. The
 * stone tiles have a heavy bevel and a crack pattern, and thirty of them
 * shouted over every part on the board.
 *
 * So the cells are drawn in `game.css` instead, which is also what the
 * sheet's notes describe — 2px borders, 2px radius — and it costs no files.
 * The stone tileset is still in `public/assets/pixel/hud-sources/` if a future skin
 * wants a stone board.
 */

/**
 * Draft card frames.
 *
 * All three are 311x454 in the sheet, so they swap without the card
 * changing size. The selected one is the gold frame, because the sheet's
 * notes make gold the colour of a primary action or an important state and
 * its own card-state row draws SELECTED in gold. It is cropped inside its
 * glow: the glow is a soft gradient that quadrupled the file, and a CSS
 * drop-shadow reproduces it from the frame that is already there.
 */
export const CARD_ART = {
  /** pixel_sci_fi_card_ui_sprite_sheet: 27,182 311x454 */
  idle: `${BASE}/cards/frame.png`,
  /** 749,185 311x454, the gold frame cropped to the same box as the others */
  selected: `${BASE}/cards/frame-selected.png`,
  /** 1109,182 315x454 */
  disabled: `${BASE}/cards/frame-disabled.png`,
} as const;
