/**
 * The pixel skin's sound language.
 *
 * ## Why this is synthesis and not the 29 WAVs the brief lists
 *
 * The supplied pack says so itself: "Audio files are not included". What
 * arrived is a design spec — lengths, pitch movement and character per cue —
 * with prompts for generating them later.
 *
 * The spec's own integration constraints then point here: extend the existing
 * audio abstraction rather than adding a second engine, and use the Web Audio
 * API since the current system already does. Synthesising against the design
 * table satisfies both, and it keeps the arcade's founding property intact —
 * it installs and plays offline, and 29 stereo 44.1kHz files would dominate a
 * bundle whose entire JS payload is 90kB gzipped.
 *
 * If real recordings arrive later, `audio.ts` routes by theme, so a buffer
 * loader can replace these voices one cue at a time without touching a call
 * site.
 *
 * ## Following the spec's numbers
 *
 * Durations come from the sound design table. Levels come from its volume
 * guidelines: UI around 0.30, marble 0.45, parts 0.58, events 0.72. Pitch
 * variation is the +/-4% it asks for, applied to repeating cues only, and
 * deliberately not to the jam warning, quota clear or round clear.
 */
import type { PartKey } from '../../game/types.js';
import { duckMovement, playSample } from './sampleBank.js';
import { PIXEL_VOLUME } from './sfxMap.js';
import type { SfxName } from './sfxMap.js';

/**
 * The mix, re-exported from the one table that defines it.
 *
 * These were local constants until the fuller sound spec arrived with its own
 * numbers. Two copies of a mix is how a mix drifts, so `sfxMap.ts` owns them
 * now and this is an alias kept so existing call sites and tests still read.
 */
export const LEVEL = PIXEL_VOLUME;

/**
 * Deterministic-ish jitter for repeated cues, +/-4%.
 *
 * `Math.random` is fine here and nowhere else in this codebase: the engine's
 * determinism is what makes a daily run reproducible, and sound is not part of
 * that. It never feeds back into state.
 */
const vary = (n = 0.04): number => 1 + (Math.random() * 2 - 1) * n;

interface ToneSpec {
  /** Start frequency in Hz. */
  readonly f: number;
  /** Sweep to this frequency across the note. Omit for a steady tone. */
  readonly to?: number;
  /** Seconds. */
  readonly d: number;
  readonly type?: OscillatorType;
  /** Peak gain before the envelope. */
  readonly g?: number;
  /** Seconds from now. */
  readonly at?: number;
}

/**
 * One oscillator with an exponential decay, and an optional pitch sweep.
 *
 * The ramp to 0.0001 rather than 0 is the same rule the classic voices follow:
 * stopping at full amplitude clicks, and the click is louder than the note.
 * Exponential ramps also cannot reach zero, so 0.0001 is the floor, not a
 * rounding choice.
 */
function tone(ac: AudioContext, s: ToneSpec): void {
  const t0 = ac.currentTime + (s.at ?? 0);
  const osc = ac.createOscillator();
  const amp = ac.createGain();
  osc.type = s.type ?? 'square';
  osc.frequency.setValueAtTime(Math.max(1, s.f), t0);
  if (s.to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, s.to), t0 + s.d);
  amp.gain.setValueAtTime(Math.max(0.0002, s.g ?? 0.05), t0);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + s.d);
  osc.connect(amp).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + s.d);
}

/**
 * A short filtered noise transient.
 *
 * This is what makes a thunk read as an impact rather than as a low beep. The
 * spec asks for "crisp transient" on nearly every cue; a pure oscillator
 * cannot produce one.
 */
function tick(ac: AudioContext, d: number, g: number, hz = 2000, at = 0): void {
  const t0 = ac.currentTime + at;
  const frames = Math.max(1, Math.floor(ac.sampleRate * d));
  const buf = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = ac.createBufferSource();
  src.buffer = buf;
  const hp = ac.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = hz;
  const amp = ac.createGain();
  amp.gain.setValueAtTime(g, t0);
  amp.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  src.connect(hp).connect(amp).connect(ac.destination);
  src.start(t0);
}

/** A run of notes, evenly spaced. The spec's "stepped" and "n-note" cues. */
function seq(ac: AudioContext, notes: readonly number[], step: number, s: Omit<ToneSpec, 'f' | 'at'>): void {
  notes.forEach((f, i) => tone(ac, { ...s, f, at: i * step }));
}

/**
 * Per-part cues, keyed by the engine's own `PartKey`.
 *
 * All ten resolve, which is the first item on the spec's QA checklist. The
 * character of each follows its row in the sound design table: weight is a
 * chunky low thunk, anvil is heavier and metallic, coil rises, prism splits
 * into two, spring steps upward, wire is a tiny tick-zap, reso is rounded,
 * fork is two clean tones an octave apart, gate and bell are below.
 */
const PART_VOICES: Record<PartKey, (ac: AudioContext) => void> = {
  weight: (ac) => {
    tick(ac, 0.02, 0.22, 1200);
    tone(ac, { f: 150, to: 90, d: 0.14, type: 'square', g: LEVEL.part * 0.5 });
  },
  anvil: (ac) => {
    tick(ac, 0.03, 0.34, 2600);
    tone(ac, { f: 320, to: 120, d: 0.2, type: 'square', g: LEVEL.part * 0.55 });
    tone(ac, { f: 196, d: 0.16, type: 'triangle', g: LEVEL.part * 0.3, at: 0.02 });
  },
  coil: (ac) => {
    tick(ac, 0.015, 0.16, 3200);
    seq(ac, [440, 660, 990], 0.055, { d: 0.07, type: 'sawtooth', g: LEVEL.part * 0.42 });
  },
  prism: (ac) => {
    tone(ac, { f: 1180, d: 0.1, type: 'triangle', g: LEVEL.part * 0.5 });
    tone(ac, { f: 1320, d: 0.16, type: 'triangle', g: LEVEL.part * 0.42, at: 0.075 });
    tone(ac, { f: 1560, d: 0.16, type: 'triangle', g: LEVEL.part * 0.36, at: 0.09 });
  },
  spring: (ac) => {
    tick(ac, 0.012, 0.14, 3000);
    seq(ac, [330, 494, 740], 0.07, { d: 0.09, type: 'square', g: LEVEL.part * 0.42 });
  },
  wire: (ac) => {
    tick(ac, 0.012, 0.18, 3800);
    tone(ac, { f: 1500, to: 2400, d: 0.08, type: 'sawtooth', g: LEVEL.part * 0.3 });
  },
  reso: (ac) => {
    tone(ac, { f: 262, d: 0.3, type: 'sine', g: LEVEL.part * 0.5 });
    tone(ac, { f: 392, d: 0.24, type: 'triangle', g: LEVEL.part * 0.34, at: 0.07 });
    tone(ac, { f: 524, d: 0.18, type: 'triangle', g: LEVEL.part * 0.22, at: 0.13 });
  },
  fork: (ac) => {
    tone(ac, { f: 660, d: 0.34, type: 'triangle', g: LEVEL.part * 0.5 });
    tone(ac, { f: 1320, d: 0.3, type: 'triangle', g: LEVEL.part * 0.4, at: 0.05 });
  },
  gate: (ac) => {
    // The neutral pass. `gateFail` below is the separate failure cue the QA
    // checklist asks for.
    seq(ac, [523, 784, 1046], 0.06, { d: 0.09, type: 'square', g: LEVEL.part * 0.4 });
  },
  bell: (ac) => {
    tone(ac, { f: 1046, d: 0.4, type: 'triangle', g: LEVEL.part * 0.5 });
    tone(ac, { f: 1568, d: 0.3, type: 'sine', g: LEVEL.part * 0.28, at: 0.04 });
    tone(ac, { f: 1046, d: 0.2, type: 'triangle', g: LEVEL.part * 0.16, at: 0.16 });
  },
};

/** Every cue the pixel theme provides. Mirrors the classic `sfx` shape. */
export const pixelVoices = {
  part: (ac: AudioContext, key: PartKey) => PART_VOICES[key](ac),

  marbleDrop: (ac: AudioContext) => {
    const v = vary();
    tone(ac, { f: 880 * v, to: 660 * v, d: 0.06, type: 'square', g: LEVEL.marble * 0.32 });
    tone(ac, { f: 660 * v, to: 520 * v, d: 0.06, type: 'square', g: LEVEL.marble * 0.26, at: 0.06 });
  },
  marbleLand: (ac: AudioContext) => {
    tick(ac, 0.015, 0.12, 1600);
    tone(ac, { f: 300 * vary(), d: 0.075, type: 'triangle', g: LEVEL.marble * 0.4 });
  },

  gateFail: (ac: AudioContext) => {
    tone(ac, { f: 400, to: 130, d: 0.18, type: 'sawtooth', g: LEVEL.part * 0.45 });
  },

  scoreSmall: (ac: AudioContext) => {
    tone(ac, { f: 988 * vary(0.025), d: 0.08, type: 'square', g: LEVEL.scoreSmall });
  },
  scoreMedium: (ac: AudioContext) => {
    const v = vary(0.025);
    seq(ac, [784 * v, 1046 * v], 0.07, { d: 0.08, type: 'square', g: LEVEL.scoreMedium * 0.8 });
  },
  scoreBig: (ac: AudioContext) => {
    seq(ac, [659, 880, 1046, 1318], 0.07, { d: 0.1, type: 'square', g: LEVEL.scoreBig * 0.7 });
  },

  // No pitch variation on these three, per the spec.
  quotaClear: (ac: AudioContext) => {
    tone(ac, { f: 131, d: 0.5, type: 'sine', g: LEVEL.event * 0.5 });
    seq(ac, [523, 659, 784, 1046], 0.1, { d: 0.16, type: 'triangle', g: LEVEL.event * 0.55 });
  },
  jam: (ac: AudioContext) => {
    seq(ac, [420, 330, 250], 0.2, { d: 0.22, type: 'sawtooth', g: LEVEL.event * 0.5 });
  },
  roundClear: (ac: AudioContext) => {
    seq(ac, [523, 659, 784, 1046, 1318], 0.11, { d: 0.18, type: 'triangle', g: LEVEL.event * 0.6 });
  },

  roundStart: (ac: AudioContext) => {
    seq(ac, [392, 523, 659], 0.06, { d: 0.09, type: 'square', g: LEVEL.ui * 1.1 });
  },
  blueprint: (ac: AudioContext) => {
    seq(ac, [349, 466, 587, 784], 0.09, { d: 0.14, type: 'triangle', g: LEVEL.event * 0.5 });
  },
  select: (ac: AudioContext) => {
    tone(ac, { f: 880, d: 0.05, type: 'square', g: LEVEL.ui });
  },
  place: (ac: AudioContext) => {
    tick(ac, 0.012, 0.1, 2400);
    tone(ac, { f: 587, d: 0.06, type: 'square', g: LEVEL.ui * 1.1 });
  },
  gameWin: (ac: AudioContext) => {
    tone(ac, { f: 131, d: 0.8, type: 'sine', g: LEVEL.win * 0.4 });
    seq(ac, [523, 659, 784, 1046, 1318, 1568], 0.12, { d: 0.22, type: 'triangle', g: LEVEL.win * 0.5 });
  },
  gameOver: (ac: AudioContext) => {
    seq(ac, [392, 330, 262, 196], 0.16, { d: 0.3, type: 'sawtooth', g: LEVEL.event * 0.5 });
  },
} as const;

export type PixelVoice = keyof typeof pixelVoices;

/**
 * Play a cue: the recorded sample if one is loaded, otherwise the synthesised
 * voice for the same cue.
 *
 * This is the whole upgrade path. Today no `.wav` exists so every call
 * synthesises; when a file lands, the same call plays it instead and nothing
 * else changes. The choice is made per cue, so a half-delivered pack is a
 * working mix rather than a broken one.
 */
export function playCue(ac: AudioContext, name: SfxName, part?: PartKey): void {
  // Big activations briefly duck the tiny movement ticks, so a chain reads.
  if (name !== 'marbleMove' && name !== 'marbleDrop' && name !== 'hover') duckMovement();
  if (playSample(ac, name)) return;
  const synth = SYNTH_FOR[name];
  if (synth) synth(ac);
  else if (part) pixelVoices.part(ac, part);
}

/**
 * The synthesised stand-in for each cue.
 *
 * Cues with no entry either resolve through a part voice (`playCue` passes the
 * key) or have no synthesised form yet, in which case they are simply silent
 * until their file arrives rather than borrowing a sound that means something
 * else.
 */
const SYNTH_FOR: Partial<Record<SfxName, (ac: AudioContext) => void>> = {
  marbleDrop: (ac) => pixelVoices.marbleDrop(ac),
  marbleMove: (ac) => tone(ac, { f: 620 * vary(), d: 0.045, type: 'square', g: LEVEL.marble * 0.18 }),
  marbleLand: (ac) => pixelVoices.marbleLand(ac),

  weight: (ac) => pixelVoices.part(ac, 'weight'),
  anvil: (ac) => pixelVoices.part(ac, 'anvil'),
  coil: (ac) => pixelVoices.part(ac, 'coil'),
  prism: (ac) => pixelVoices.part(ac, 'prism'),
  spring: (ac) => pixelVoices.part(ac, 'spring'),
  wire: (ac) => pixelVoices.part(ac, 'wire'),
  reso: (ac) => pixelVoices.part(ac, 'reso'),
  fork: (ac) => pixelVoices.part(ac, 'fork'),
  gatePass: (ac) => pixelVoices.part(ac, 'gate'),
  gateFail: (ac) => pixelVoices.gateFail(ac),
  bell: (ac) => pixelVoices.part(ac, 'bell'),

  scoreSmall: (ac) => pixelVoices.scoreSmall(ac),
  scoreMedium: (ac) => pixelVoices.scoreMedium(ac),
  scoreBig: (ac) => pixelVoices.scoreBig(ac),
  quotaClear: (ac) => pixelVoices.quotaClear(ac),

  select: (ac) => pixelVoices.select(ac),
  place: (ac) => pixelVoices.place(ac),
  blueprint: (ac) => pixelVoices.blueprint(ac),
  click: (ac) => tone(ac, { f: 740, d: 0.055, type: 'square', g: LEVEL.ui }),
  hover: (ac) => tone(ac, { f: 1200, d: 0.035, type: 'square', g: LEVEL.hover }),
  error: (ac) => {
    tone(ac, { f: 330, d: 0.07, type: 'square', g: LEVEL.ui });
    tone(ac, { f: 247, d: 0.09, type: 'square', g: LEVEL.ui, at: 0.06 });
  },
  draftOpen: (ac) => seq(ac, [523, 659, 880], 0.06, { d: 0.08, type: 'triangle', g: LEVEL.ui }),

  jam: (ac) => pixelVoices.jam(ac),
  roundStart: (ac) => pixelVoices.roundStart(ac),
  roundClear: (ac) => pixelVoices.roundClear(ac),
  win: (ac) => pixelVoices.gameWin(ac),
  gameOver: (ac) => pixelVoices.gameOver(ac),
};
