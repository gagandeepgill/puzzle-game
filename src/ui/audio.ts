/**
 * Sound.
 *
 * Synthesised, not sampled: the whole arcade is meant to install and run
 * offline, and a handful of oscillators cost nothing to ship where audio files
 * would dominate the bundle.
 *
 * The context is created lazily on the first blip, because browsers refuse to
 * start one outside a user gesture — constructing it at module load leaves a
 * permanently suspended context and silence for the rest of the session.
 */
import { pixelVoices, playCue } from './pixel/pixelSfx.js';
import { preload } from './pixel/sampleBank.js';
import { DEFERRED, PRELOAD } from './pixel/sfxMap.js';
import type { SfxName } from './pixel/sfxMap.js';
import type { PartKey } from '../game/types.js';

/**
 * Which sound language is playing.
 *
 * Paired with the visual skin, but kept a separate type because the two are
 * separate decisions: the spec is explicit that classic keeps its existing
 * sound language rather than being replaced.
 */
export type SoundTheme = 'classic' | 'pixel';

let theme: SoundTheme = 'classic';
export const setSoundTheme = (next: SoundTheme): void => { theme = next; };
export const soundTheme = (): SoundTheme => theme;

let ctx: AudioContext | null = null;
let muted = false;

const MUTE_KEY = 'payload.muted.v1';

try {
  muted = localStorage.getItem(MUTE_KEY) === '1';
} catch {
  // Site data blocked. Default to audible.
}

export const isMuted = (): boolean => muted;

export function setMuted(next: boolean): void {
  muted = next;
  try {
    localStorage.setItem(MUTE_KEY, next ? '1' : '0');
  } catch {
    // Preference won't survive the session. Not worth surfacing.
  }
}

function context(): AudioContext | null {
  if (muted) return null;
  try {
    ctx ??= new AudioContext();
    if (theme === 'pixel') warm(ctx);
    // Autoplay policy suspends the context until a gesture. Resuming here is
    // safe: the first blip always follows a tap.
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/**
 * Warm the sample cache.
 *
 * Called from the first cue rather than at module load, because decoding needs
 * a context and a context needs a gesture. Safe to call repeatedly; the bank
 * remembers what it has already looked for, including what is absent.
 */
let warmed = false;
function warm(ac: AudioContext): void {
  if (warmed) return;
  warmed = true;
  preload(ac, PRELOAD);
  // The long event sounds cannot fire in the first seconds of a run, so they
  // wait for idle time rather than competing with the first drop.
  const idle = (cb: () => void) => (
    typeof requestIdleCallback === 'function' ? requestIdleCallback(cb) : setTimeout(cb, 2000)
  );
  idle(() => preload(ac, DEFERRED));
}

export function blip(
  freq: number, dur = 0.06, type: OscillatorType = 'square', gain = 0.05,
): void {
  const ac = context();
  if (!ac) return;
  try {
    const osc = ac.createOscillator();
    const amp = ac.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    // Exponential ramp to near-silence rather than a hard stop, which clicks.
    amp.gain.setValueAtTime(gain, ac.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + dur);
    osc.connect(amp).connect(ac.destination);
    osc.start();
    osc.stop(ac.currentTime + dur);
  } catch {
    // A device that refuses to make sound should not stop the game.
  }
}

/**
 * The cues, as the rest of the app calls them.
 *
 * Every signature is unchanged from before the pixel theme existed, so
 * `usePayloadRun.ts` needed no rewrite: each cue asks the theme what it should
 * sound like. `trigger` gained an optional part key, which the drop already
 * carries on its event, so the pixel theme can give all ten parts their own
 * voice while classic keeps its one rising blip.
 */
export const sfx = {
  trigger: (n: number, part?: PartKey) => {
    if (theme === 'pixel' && part) {
      const ac = context();
      // Gate's success cue is its own file, distinct from the confiscation
      // one, so a player can tell the two outcomes apart without looking.
      if (ac) playCue(ac, part === 'gate' ? 'gatePass' : (part as SfxName), part);
      return;
    }
    blip(300 + Math.min(n, 22) * 45);
  },
  split: () => voice('part', 'prism', () => blip(880, 0.09, 'triangle')),
  spring: () => voice('part', 'spring', () => blip(660, 0.1, 'sine', 0.06)),
  skid: () => voice('part', 'anvil', () => blip(180, 0.07, 'sawtooth', 0.04)),
  seized: () => pixelOr('gateFail', () => blip(120, 0.22, 'sawtooth', 0.06)),
  /** The tiny per-step tick. Ducked automatically while a part is sounding. */
  marbleStep: () => { if (theme === 'pixel') { const ac = context(); if (ac) playCue(ac, 'marbleMove'); } },
  roundStart: () => { if (theme === 'pixel') { const ac = context(); if (ac) playCue(ac, 'roundStart'); } },
  select: () => pixelOr('select', () => blip(660, 0.04, 'square', 0.03)),
  bank: (value: number) => pixelOr(
    value > 80 ? 'scoreBig' : value > 20 ? 'scoreMedium' : 'scoreSmall',
    () => blip(value > 80 ? 1046 : 784, 0.11, 'triangle', 0.06),
  ),
  place: () => pixelOr('place', () => blip(520, 0.05, 'square', 0.04)),
  blueprint: () => pixelOr('blueprint', () => blip(700, 0.12, 'triangle', 0.06)),
  roundWon: () => {
    if (theme === 'pixel') { const ac = context(); if (ac) pixelVoices.quotaClear(ac); return; }
    // A bass note under the arpeggio. Peggle gates its whole musical climax to
    // the last orange peg; spending it per part is what makes it stop meaning
    // anything, so this fires only when a quota is crossed.
    blip(98, 0.5, 'sine', 0.09);
    [523, 659, 784].forEach((f, i) => {
      setTimeout(() => blip(f, 0.16, 'triangle', 0.07), i * 110);
    });
  },
  runLost: () => pixelOr('gameOver', () => blip(110, 0.5, 'sawtooth', 0.07)),
  runWon: () => pixelOr('win', () => {
    blip(98, 0.5, 'sine', 0.09);
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => blip(f, 0.16, 'triangle', 0.07), i * 110));
  }),
};

/**
 * Play a pixel voice when the pixel theme is on, otherwise the classic one.
 *
 * The classic fallback is a thunk rather than a value so its oscillators are
 * only built when it actually plays.
 */
function pixelOr(name: SfxName, classic: () => void): void {
  if (theme !== 'pixel') { classic(); return; }
  const ac = context();
  if (ac) playCue(ac, name);
}

/** The same, for cues whose pixel version is a specific part voice. */
function voice(_kind: 'part', part: PartKey, classic: () => void): void {
  if (theme !== 'pixel') { classic(); return; }
  const ac = context();
  if (ac) playCue(ac, part as SfxName, part);
}
