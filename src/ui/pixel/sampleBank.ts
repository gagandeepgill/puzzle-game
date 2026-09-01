/**
 * Decoded-sample playback for the pixel sound theme.
 *
 * The pipeline the spec asks for: fetch once, decode once, cache the
 * AudioBuffer, then build a fresh BufferSource per play routed through a
 * GainNode, with `playbackRate` set where variation is wanted. A part
 * activation never fetches.
 *
 * ## Missing files are a normal outcome, not an error
 *
 * No `.wav` has been supplied. Every load path treats a 404 as "this cue has
 * no sample", caches that fact so it is not retried on every activation, and
 * lets the caller fall back to synthesis. The game is fully audible today and
 * gets better one file at a time, with no code change when they land.
 *
 * That is also the failure mode the spec requires in general: audio files
 * failing to load, Web Audio being unavailable, or the browser blocking sound
 * before a gesture must never break gameplay. Nothing here throws.
 */
import { NO_PITCH_VARIATION, PIXEL_SFX, PIXEL_VOLUME, VOLUME_FOR } from './sfxMap.js';
import type { SfxName } from './sfxMap.js';

/** `null` means we looked and there is no usable sample. */
const buffers = new Map<SfxName, AudioBuffer | null>();
const inFlight = new Map<SfxName, Promise<AudioBuffer | null>>();

/**
 * How many copies of one cue may sound at once.
 *
 * The spec's rapid-activation rule: allow different part sounds to overlap,
 * but limit identical ones. A Prism chain firing eight times in a frame should
 * read as a chain, not as one sound eight times as loud.
 */
const MAX_VOICES = 3;
const live = new Map<SfxName, number>();

/**
 * Ducking. A major activation briefly lowers the tiny movement cues rather
 * than silencing them, which is the spec's "duck tiny movement sounds slightly
 * during major activations".
 */
let duckUntil = 0;
const DUCK_MS = 180;
const DUCK_TO = 0.45;

export function duckMovement(now = Date.now()): void {
  duckUntil = now + DUCK_MS;
}

const isDucked = (name: SfxName, now = Date.now()): boolean =>
  now < duckUntil && (name === 'marbleMove' || name === 'marbleDrop');

/**
 * Fetch and decode, once per cue.
 *
 * `decodeAudioData` needs a context, which only exists after a gesture, so
 * this is called on the first sound rather than at module load.
 */
async function load(ac: AudioContext, name: SfxName): Promise<AudioBuffer | null> {
  const cached = buffers.get(name);
  if (cached !== undefined) return cached;
  const running = inFlight.get(name);
  if (running) return running;

  const task = (async (): Promise<AudioBuffer | null> => {
    try {
      const res = await fetch(PIXEL_SFX[name]);
      if (!res.ok) return null;
      const bytes = await res.arrayBuffer();
      return await ac.decodeAudioData(bytes);
    } catch {
      // Offline, blocked, or not a decodable file. Synthesis covers it.
      return null;
    }
  })().then((buf) => {
    buffers.set(name, buf);
    inFlight.delete(name);
    return buf;
  });

  inFlight.set(name, task);
  return task;
}

/** +/-4%, and never for the cues the spec says must stay recognisable. */
function rateFor(name: SfxName): number {
  if (NO_PITCH_VARIATION.has(name)) return 1;
  return 0.96 + Math.random() * 0.08;
}

/**
 * Play a cue from its sample.
 *
 * Returns false when there is nothing to play, which is the caller's signal to
 * synthesise instead. Deliberately synchronous in that answer: a drop cannot
 * await a decode mid-frame, so a cue whose sample has not loaded yet is
 * synthesised this time and sampled next time.
 */
export function playSample(ac: AudioContext, name: SfxName, gainScale = 1): boolean {
  const buf = buffers.get(name);
  if (!buf) {
    // Not loaded yet, or known absent. Warm it for next time either way.
    if (buf === undefined) void load(ac, name);
    return false;
  }

  const playing = live.get(name) ?? 0;
  if (playing >= MAX_VOICES) return true; // counted as handled: dropping it is the point

  const level = PIXEL_VOLUME[VOLUME_FOR[name]] * gainScale * (isDucked(name) ? DUCK_TO : 1);
  try {
    const src = ac.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = rateFor(name);
    const amp = ac.createGain();
    amp.gain.value = level;
    src.connect(amp).connect(ac.destination);
    live.set(name, playing + 1);
    src.onended = () => { live.set(name, Math.max(0, (live.get(name) ?? 1) - 1)); };
    src.start();
    return true;
  } catch {
    return false;
  }
}

/**
 * Warm the cache.
 *
 * Called on the first user gesture, when a context exists. Failures are
 * ignored by construction: `load` resolves to null rather than rejecting, so
 * one missing file cannot stop the rest preloading.
 */
export function preload(ac: AudioContext, names: readonly SfxName[]): void {
  for (const name of names) void load(ac, name);
}

/** Test seam: forget everything loaded. */
export function resetBank(): void {
  buffers.clear();
  inFlight.clear();
  live.clear();
  duckUntil = 0;
}

/** Test seam: what the bank believes about a cue. */
export const bankState = (name: SfxName): 'unknown' | 'absent' | 'loaded' => {
  const b = buffers.get(name);
  return b === undefined ? 'unknown' : b === null ? 'absent' : 'loaded';
};
