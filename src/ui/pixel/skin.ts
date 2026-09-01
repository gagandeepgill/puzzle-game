/**
 * Which skin the app is wearing.
 *
 * A skin is presentation only. It changes how a part is drawn and how a panel
 * is filled; it never changes what a part does, what a drop scores, or what a
 * screen reader is told. If a skin needs a rule change to look right, the rule
 * is in the wrong place.
 *
 * Each one is added rather than replacing the last: `classic` is the original
 * cockpit, `pixel` is the first pass at the Simple Pixel direction, and `game`
 * is the rework against the reference sheet. A new design becomes a new entry
 * here and a new view, so nothing already shipped is overwritten to make room
 * for it.
 */
export type GameSkin = 'classic' | 'pixel' | 'game';

export const SKINS: readonly GameSkin[] = ['classic', 'pixel', 'game'];

/** What the skin picker calls each one. */
export const SKIN_LABEL: Record<GameSkin, string> = {
  classic: 'Classic',
  pixel: 'Pixel',
  game: 'Game',
};

/**
 * Change this one line to ship a different skin by default.
 *
 * Game, as of the HUD pack landing: it is the one built against the reference
 * mockups, and leaving it behind the settings sheet meant nobody saw it
 * without going looking.
 *
 * A player who has already chosen a skin is unaffected. This is only the
 * fallback when storage holds nothing usable, so nobody who picked Classic or
 * Pixel gets moved off it, and both are still one tap away in settings.
 */
export const DEFAULT_SKIN: GameSkin = 'game';

const KEY = 'payload.skin.v1';

function isSkin(value: unknown): value is GameSkin {
  return typeof value === 'string' && (SKINS as readonly string[]).includes(value);
}

/**
 * Validated, not cast. `store.ts` learned this the hard way: the vanilla build
 * wrote a different shape under a neighbouring key, and reading it back with a
 * cast produced a HUD full of `undefined` rather than a clean fallback.
 */
export function loadSkin(): GameSkin {
  try {
    const raw = localStorage.getItem(KEY);
    return isSkin(raw) ? raw : DEFAULT_SKIN;
  } catch {
    // Site data blocked. The default is still a working game.
    return DEFAULT_SKIN;
  }
}

export function saveSkin(skin: GameSkin): void {
  try {
    localStorage.setItem(KEY, skin);
  } catch {
    // Preference will not survive the session. Not worth surfacing.
  }
}
