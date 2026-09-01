/**
 * The HUD art the `game` skin draws with.
 *
 * The pack arrived as eight 1448x1086 sprite sheets, 6.7MB of them. Those are
 * sources, not assets: they live in `docs/pixel/hud-sources/` and are not
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
 * Board cells, one per placement state.
 *
 * The pack draws these four explicitly, which is why the skin uses art here
 * rather than a border colour: green and red placement cells are the
 * clearest thing in the sheet and CSS cannot draw the crosshair.
 */
export const CELL_ART = {
  /** retro_sci_fi_board_tileset_sprites: 31,522 323x329 */
  idle: `${BASE}/board/cell.png`,
  /** 386,521 323x333 */
  valid: `${BASE}/board/cell-valid.png`,
  /** 739,521 327x333 */
  invalid: `${BASE}/board/cell-invalid.png`,
  /** 1091,518 333x340 */
  focus: `${BASE}/board/cell-focus.png`,
} as const;

/**
 * Draft card frames.
 *
 * All three are 311x454 in the sheet, so they swap without the card
 * changing size. The selected one is cropped inside its glow: the glow is a
 * soft gradient that quadrupled the file, and a CSS drop-shadow reproduces it
 * from the frame that is already there.
 */
export const CARD_ART = {
  /** pixel_sci_fi_card_ui_sprite_sheet: 27,182 311x454 */
  idle: `${BASE}/cards/frame.png`,
  /** 383,185 311x454, the glowing frame cropped to the same box as the others */
  selected: `${BASE}/cards/frame-selected.png`,
  /** 1109,182 315x454 */
  disabled: `${BASE}/cards/frame-disabled.png`,
} as const;

/**
 * The wordmark plate.
 *
 * The word is painted into the art, so the element that carries it needs a
 * real text alternative. Ratio is 1269:303, which the CSS holds so the plate
 * never stretches.
 */
export const LOGO_ART = {
  /** retro_payload_hud_pixel_art_assets: 90,117 1269x303 */
  src: `${BASE}/ui/logo.png`,
  width: 1269,
  height: 303,
} as const;
