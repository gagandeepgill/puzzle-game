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
 * From `neon_pixel_ui_icon_sheet.png` rather than `pixel_sci_fi_hud_icon_set`,
 * which is the order the brief asks for: the main set first, the neon sheet
 * only where the main set has no match. The main set draws a marble, a prism,
 * a progress bar, a divider and an info badge, and none of the five below.
 *
 * The game skin drew these as SVG glyphs and as two sprites left over from an
 * older pack. These are the pack's own.
 */
export const ICON_ART = {
  /** neon_pixel_ui_icon_sheet: 144,78 200x250 */
  jam: `${BASE}/icons/jam.png`,
  /** 587,82 260x266 */
  blueprints: `${BASE}/icons/blueprints.png`,
  /** 1033,70 291x299 */
  settings: `${BASE}/icons/settings.png`,
  /** 157,451 266x217 */
  soundOn: `${BASE}/icons/sound-on.png`,
  /** 615,444 224x230 */
  soundOff: `${BASE}/icons/sound-off.png`,
  /** 170,768 223x224 */
  check: `${BASE}/icons/check.png`,
} as const;

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
 * Frame strips, six frames each, 96px per frame.
 *
 * The atlas draws these as loose rows with the frames at different sizes and
 * uneven spacing, which a `steps()` animation cannot read. Each frame is
 * recut on its own centre into a fixed box and the six are stacked into an
 * even strip, so the animation is a background-position walk rather than six
 * separate files.
 *
 * Spring and Bell play on the cell that fired; Jam plays on the panel when one
 * arrives. Coil and Prism have rows in the atlas too and are not used: the
 * pixel skin already gives them a pulse and a split in CSS, and those rules
 * are unscoped, so they play here as well.
 *
 * Source windows in retro_pixel_game_fx_sprite_atlas, each 176x176 taken on
 * its frame's own centre, in play order:
 *
 *   spring: 92,504 176x176 · 310,522 176x176 · 527,500 176x176 ·
 *           739,535 176x176 · 956,498 176x176 · 1173,506 176x176
 *   bell:   78,685 176x176 · 313,684 176x176 · 532,677 176x176 ·
 *           768,675 176x176 · 960,682 176x176 · 1189,684 176x176
 *   jam:    82,855 176x176 · 302,856 176x176 · 526,856 176x176 ·
 *           751,854 176x176 · 972,861 176x176 · 1191,855 176x176
 */
export const FX_STRIP = {
  spring: `${BASE}/fx/spring.png`,
  bell: `${BASE}/fx/bell.png`,
  jam: `${BASE}/fx/jamfx.png`,
} as const;

/** How many frames each strip holds. The CSS `steps()` has to match. */
export const FX_FRAMES = 6;

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
