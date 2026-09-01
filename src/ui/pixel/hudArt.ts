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
export const BOARD_FRAME = `${BASE}/board/frame.png`;

/**
 * The quota bar, and the divider under a section title.
 *
 * The bar is two pieces because a track and a fill have to move
 * independently. Both are 9-sliced rather than stretched: they have rounded
 * caps, and stretching a cap to a 200px bar smears it into a lozenge, while
 * slicing keeps the caps their drawn size and repeats only the straight
 * middle. The fill's own caps then sit at the ends of the filled portion,
 * which is what a partly-full bar should look like.
 *
 * pixel_sci_fi_hud_icon_set: track 557,562 275x134, fill 93,564 276x132,
 * divider 926,570 472x118.
 */
export const BAR_ART = {
  track: `${BASE}/panels/bar-track.png`,
  fill: `${BASE}/panels/bar-fill.png`,
} as const;

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
export const PANEL_ART = `${BASE}/panels/panel.png`;

/**
 * Button frames, as 9-slices.
 *
 * Blue is the resting state and gold marks an active or important one, which
 * is the sheet's own rule for gold. The pressed frame is the third column of
 * each row rather than a CSS darkening, so the press is authored art.
 *
 * The sheet also draws S / E / 1 keycaps beside these. They stay unused: the
 * game has no keyboard shortcut to label, and drawing one would promise a
 * binding that does not exist.
 *
 * Quartered from the source so an 8px slice renders at an 8px border.
 */
export const BUTTON_ART = {
  /** pixel_ui_button_and_keycap_sprite_sheet: 32,329 431x146 */
  idle: `${BASE}/buttons/btn.png`,
  /** 32,98 431x148 */
  active: `${BASE}/buttons/btn-on.png`,
  /** 986,100 428x153 */
  pressed: `${BASE}/buttons/btn-down.png`,
  /** 56,552 195x188, the square one, for the header's icon buttons */
  icon: `${BASE}/buttons/btn-icon.png`,
} as const;

/**
 * HUD icons.
 *
 * One icon, not five. Jam, blueprints and settings were cropped from the neon
 * sheet and have since been delivered as individual 32x32 files, so they come
 * from `UI_SPRITE` now and their crops are gone. The check has no delivered
 * twin, so it stays here.
 */
export const ICON_ART = {
  /** neon_pixel_ui_icon_sheet: 170,768 223x224 */
  check: `${BASE}/icons/check.png`,
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
  valid: `${BASE}/board/cell-valid.png`,
  invalid: `${BASE}/board/cell-invalid.png`,
  focus: `${BASE}/board/cell-focus.png`,
} as const;

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
