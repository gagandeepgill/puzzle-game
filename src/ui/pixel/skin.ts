/**
 * Which skin the app is wearing.
 *
 * A skin is presentation only. It changes how a part is drawn and how a panel
 * is filled; it never changes what a part does, what a drop scores, or what a
 * screen reader is told. If a skin needs a rule change to look right, the rule
 * is in the wrong place.
 */
export type GameSkin = 'classic' | 'pixel';

export const SKINS: readonly GameSkin[] = ['classic', 'pixel'];

/**
 * Change this one line to ship a different skin by default.
 *
 * Pixel, as of the sprite pack completing. A player who has already chosen a
 * skin is unaffected: this is only the fallback when storage holds nothing
 * usable, so nobody who picked Classic gets moved off it.
 */
export const DEFAULT_SKIN: GameSkin = 'pixel';

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
