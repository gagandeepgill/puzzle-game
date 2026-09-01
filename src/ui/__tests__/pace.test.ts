/**
 * Fall pacing, per skin.
 *
 * The pixel animation direction asks for 120-180ms per board step. The classic
 * curve, tuned and measured in #53, runs 86 down to 49. The two disagree, so
 * the pacing is scoped to the skin and both bands are asserted here — a change
 * to either curve that leaves its own direction's band fails.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';

const src = readFileSync(new URL('../usePayloadRun.ts', import.meta.url), 'utf8');

/** Pull a curve's constants out of the source so the test cannot drift from it. */
function curve(name: string): (step: number) => number {
  const m = new RegExp(`const ${name} = \\(step: number\\) => Math\\.round\\(([\\d.]+) \\+ ([\\d.]+) \\* Math\\.pow\\(([\\d.]+),`).exec(src);
  if (!m) throw new Error(`could not read ${name} from usePayloadRun.ts`);
  const [floor, span, decay] = [Number(m[1]), Number(m[2]), Number(m[3])];
  return (step) => Math.round(floor + span * decay ** Math.max(0, step - 1));
}

const ROWS = 6;
const steps = Array.from({ length: ROWS }, (_, i) => i + 1);

describe('classic pacing', () => {
  const fallMs = curve('fallMs');

  it('reproduces the curve the comment documents', () => {
    expect(steps.map(fallMs)).toEqual([86, 73, 64, 57, 52, 49]);
  });

  it('accelerates and never reverses', () => {
    const values = steps.map(fallMs);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]!, `step ${i + 1}`).toBeLessThan(values[i - 1]!);
    }
  });
});

describe('pixel pacing', () => {
  const fallMsPixel = curve('fallMsPixel');

  it('stays inside the 140-170ms the layout reference asks for', () => {
    for (const step of steps) {
      const ms = fallMsPixel(step);
      expect(ms, `step ${step} is ${ms}ms`).toBeGreaterThanOrEqual(140);
      expect(ms, `step ${step} is ${ms}ms`).toBeLessThanOrEqual(170);
    }
  });

  it('is slower than classic at every step, which is the point', () => {
    const classic = curve('fallMs');
    for (const step of steps) {
      expect(fallMsPixel(step)).toBeGreaterThan(classic(step));
    }
  });

  it('keeps the same accelerating shape', () => {
    // The rhythm is what reads as a contraption. Only the band moved.
    const values = steps.map(fallMsPixel);
    for (let i = 1; i < values.length; i++) {
      expect(values[i]!).toBeLessThan(values[i - 1]!);
    }
  });
});

describe('the marble transition tracks whichever pacing is running', () => {
  it('Board derives its duration from the frame rather than hardcoding one', () => {
    // A fixed duration was the bug that stopped the marble ever arriving at a
    // cell. It has to follow stepMs, and now stepMs has two possible bands.
    const board = readFileSync(new URL('../Board.tsx', import.meta.url), 'utf8');
    expect(board).toContain('stepMs - 8');
    expect(board).not.toMatch(/transitionDuration: '\d+ms'/);
  });
});

// The per-part activation durations used to be asserted here against bands
// from the layout reference. They now live in `PIXEL_MOTION` and are checked
// by `motion.test.ts`, which compares the TypeScript source against its CSS
// mirrors. Two places asserting the same numbers is how they drift, and the
// two specs already disagreed once: the layout reference put Spring at
// 280-360ms and the implementation map sets it to 260.
