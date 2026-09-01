/**
 * The motion constants and their CSS mirrors.
 *
 * `PIXEL_MOTION` is the source, but CSS cannot import a TypeScript value, so
 * every duration exists twice. This is what stops the two drifting: change one
 * and the test names the other.
 *
 * The same problem as the cockpit breakpoint, which lives in four files for
 * the same reason and is guarded the same way.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MOTION_VAR, PIXEL_MOTION } from '../pixel/motion.js';
import type { MotionKey } from '../pixel/motion.js';

const css = readFileSync(new URL('../pixel/pixel.css', import.meta.url), 'utf8');

/** Read a `--px-t-*` declaration's millisecond value. */
function cssMs(prop: string): number {
  const at = css.indexOf(`${prop}:`);
  if (at < 0) throw new Error(`${prop} is not declared in pixel.css`);
  const m = /(\d+)ms/.exec(css.slice(at, at + 60));
  if (!m) throw new Error(`${prop} has no ms value`);
  return Number(m[1]);
}

describe('motion constants', () => {
  for (const [key, prop] of Object.entries(MOTION_VAR) as [MotionKey, string][]) {
    it(`${prop} matches PIXEL_MOTION.${key}`, () => {
      expect(cssMs(prop)).toBe(PIXEL_MOTION[key]);
    });
  }

  it('gives every part key a duration', () => {
    const parts = ['weight', 'anvil', 'coil', 'prism', 'spring', 'wire', 'reso', 'fork', 'gate', 'bell'] as const;
    for (const p of parts) {
      expect(PIXEL_MOTION[p], `${p} has no timing`).toBeGreaterThan(0);
    }
  });

  it('keeps the frequently-fired cues shortest', () => {
    // Wire fires on nearly every part a marble touches. If it ever ran as long
    // as a Bell the board would sound and look like one long smear.
    expect(PIXEL_MOTION.wire).toBeLessThan(PIXEL_MOTION.bell);
    expect(PIXEL_MOTION.wire).toBeLessThanOrEqual(PIXEL_MOTION.weight);
  });

  it('scales the one-off events above the per-part ones', () => {
    const partMax = Math.max(
      PIXEL_MOTION.weight, PIXEL_MOTION.anvil, PIXEL_MOTION.coil, PIXEL_MOTION.prism,
      PIXEL_MOTION.spring, PIXEL_MOTION.wire, PIXEL_MOTION.reso, PIXEL_MOTION.fork,
      PIXEL_MOTION.gate, PIXEL_MOTION.bell,
    );
    expect(PIXEL_MOTION.jamIntro).toBeGreaterThan(partMax);
    expect(PIXEL_MOTION.roundClear).toBeGreaterThan(PIXEL_MOTION.jamIntro);
    expect(PIXEL_MOTION.gameResult).toBeGreaterThan(PIXEL_MOTION.roundClear);
  });

  it('matches the marble step to the pixel pacing curve', () => {
    // `marbleStep` has no CSS twin: the playback hook applies it in JS. The
    // spec's 155ms should sit inside the curve the hook actually produces.
    const hook = readFileSync(new URL('../usePayloadRun.ts', import.meta.url), 'utf8');
    const m = /const fallMsPixel = \(step: number\) => Math\.round\(([\d.]+) \+ ([\d.]+) \* Math\.pow\(([\d.]+),/.exec(hook);
    expect(m, 'could not read fallMsPixel').not.toBeNull();
    const [floor, span, decay] = [Number(m![1]), Number(m![2]), Number(m![3])];
    const steps = Array.from({ length: 6 }, (_, i) => Math.round(floor + span * decay ** i));
    expect(Math.min(...steps)).toBeLessThanOrEqual(PIXEL_MOTION.marbleStep + 20);
    expect(Math.max(...steps)).toBeGreaterThanOrEqual(PIXEL_MOTION.marbleStep - 20);
  });
});

describe('pixel motion discipline', () => {
  it('has no looping animation anywhere in the skin', () => {
    // "Avoid constant idle animation." Every keyframe fires once, on the frame
    // a playback event says something happened.
    const shell = readFileSync(new URL('../pixel/shell.css', import.meta.url), 'utf8');
    expect(css).not.toMatch(/animation:[^;]*infinite/);
    expect(shell).not.toMatch(/animation:[^;]*infinite/);
  });

  it('gives Spring the largest travel, as the strongest bounce', () => {
    // Strongest is about amplitude, not duration: Spring is 260ms, the same as
    // Prism and shorter than Bell. What makes it the strongest is how far it
    // moves, so that is what gets asserted.
    // A window from the declaration, not a regex trying to balance braces: a
    // lazy `\{...\}` stops at the first inner `}` and only ever saw the 0%
    // keyframe, which reported 12% and hid the real 26%.
    const at = css.indexOf('@keyframes px-bounce');
    expect(at, 'px-bounce is not declared').toBeGreaterThan(-1);
    const block = css.slice(at, at + 400);
    const travel = [...block.matchAll(/translateY\((-?[\d.]+)%\)/g)]
      .map((m) => Math.abs(Number(m[1])));
    expect(travel.length, 'px-bounce has no translateY').toBeGreaterThan(0);
    expect(Math.max(...travel)).toBeGreaterThanOrEqual(20);
  });
});

/**
 * Where the mirrors are declared, not just what they say.
 *
 * The part animations are not scoped to a skin — `PixelPart` adds
 * `.px-activate` whichever skin is wearing it — so their durations cannot be
 * scoped either. While the block sat inside `.pixel-skin`, every part in the
 * game skin got the class and an undefined duration, which makes the whole
 * `animation` shorthand invalid at computed-value time. Parts fired without
 * moving and nothing failed anywhere, which is why this is a test and not a
 * comment.
 */
describe('motion mirrors are reachable from every skin', () => {
  /** The declaration block a property sits in, by its selector. */
  function selectorFor(prop: string): string {
    const at = css.indexOf(`${prop}:`);
    expect(at, `${prop} is not declared`).toBeGreaterThan(-1);
    const open = css.lastIndexOf('{', at);
    const start = css.lastIndexOf('}', open) + 1;
    return css.slice(start, open).replace(/\/\*[\s\S]*?\*\//g, '').trim();
  }

  for (const prop of Object.values(MOTION_VAR)) {
    it(`${prop} is on :root, so an unscoped animation can read it`, () => {
      expect(selectorFor(prop as string)).toBe(':root');
    });
  }

  it('the animations that read them are unscoped too', () => {
    // If these ever gain a skin prefix, the :root requirement above stops
    // being the thing that matters and this test should change with it.
    expect(css).toContain(".px-activate[data-part='weight']");
    expect(css).not.toContain('.pixel-skin .px-activate[');
  });
});
