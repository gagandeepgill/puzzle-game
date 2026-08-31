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
    // Autoplay policy suspends the context until a gesture. Resuming here is
    // safe: the first blip always follows a tap.
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
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

/** Rising with each part a marble touches, so a long cascade audibly builds. */
export const sfx = {
  trigger: (n: number) => blip(300 + Math.min(n, 22) * 45),
  split: () => blip(880, 0.09, 'triangle'),
  spring: () => blip(660, 0.1, 'sine', 0.06),
  skid: () => blip(180, 0.07, 'sawtooth', 0.04),
  seized: () => blip(120, 0.22, 'sawtooth', 0.06),
  bank: (value: number) => blip(value > 80 ? 1046 : 784, 0.11, 'triangle', 0.06),
  place: () => blip(520, 0.05, 'square', 0.04),
  blueprint: () => blip(700, 0.12, 'triangle', 0.06),
  roundWon: () => {
    // A bass note under the arpeggio. Peggle gates its whole musical climax to
    // the last orange peg; spending it per part is what makes it stop meaning
    // anything, so this fires only when a quota is crossed.
    blip(98, 0.5, 'sine', 0.09);
    [523, 659, 784].forEach((f, i) => {
      setTimeout(() => blip(f, 0.16, 'triangle', 0.07), i * 110);
    });
  },
  runLost: () => blip(110, 0.5, 'sawtooth', 0.07),
};
