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
export const BOARD_FRAME = `${BASE}/board/frame.png`;

/**
 * The marble in flight.
 *
 * Every mockup draws it as a silver sphere. `PixelMarble` is shared with the
 * pixel skin, which uses a blue tile, so this is swapped in `game.css` rather
 * than in the component: changing the component would change a skin that has
 * already shipped.
 *
 * pixel_sci_fi_hud_icon_set: 590,129 252x259.
 */
export const MARBLE_ART = `${BASE}/board/marble.png`;

/**
 * The header stat plate, as a 9-slice.
 *
 * The sheet draws this with ROUND and a 7 painted into it, which is why an
 * earlier pass called it unusable and drew a CSS border instead. That was
 * wrong: a 9-slice discards the centre unless `fill` is asked for, so the
 * baked text goes with it and the live value sits in the well. Only using the
 * plate whole is impossible.
 *
 * Stored at a quarter of the source, 106x40, so a 10px slice renders at a
 * 10px border with no resampling.
 *
 * retro_payload_hud_pixel_art_assets: 151,502 425x162.
 */
export const PLATE_ART = `${BASE}/ui/plate.png`;

/**
 * The burst behind the biggest score pops.
 *
 * The atlas also draws `+10`, `+50` and `+100` as finished plates. Those are
 * unusable here: a score is whatever the machine made it, and a plate with
 * 100 painted on it cannot show 37. The burst carries no number, so it goes
 * behind a figure the run actually produced.
 *
 * retro_pixel_game_fx_sprite_atlas: 56,43 149x187.
 */
export const SCORE_BURST = `${BASE}/fx/score-burst.png`;

/*
 * Board cells are not here on purpose.
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
 * The stone tileset is still in `docs/pixel/hud-sources/` if a future skin
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
