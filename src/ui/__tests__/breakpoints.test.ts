/**
 * The cockpit breakpoint exists as a number in four files and cannot be
 * imported into three of them.
 *
 * `src/ui/breakpoints.ts` is the source. `tailwind.config.js` needs a literal
 * because Tailwind resolves screens at build time, and `src/ui/index.css`
 * needs three because a media query cannot read a TypeScript constant. So the
 * copies are checked instead of trusted.
 *
 * This is not hypothetical. The value moved 1140 -> 1180 when the rails grew,
 * and it had to be changed in all four by hand; missing the one in `App.tsx`
 * would have left the reference panel opening at a width where the third
 * column does not yet exist, which is exactly the kind of bug that looks like
 * a rendering glitch and is actually a stale number.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { COCKPIT_MIN_WIDTH, COCKPIT_QUERY, watchCockpit } from '../breakpoints.js';

const read = (path: string) => readFileSync(new URL(`../../../${path}`, import.meta.url), 'utf8');

describe('cockpit breakpoint', () => {
  it('the query string is built from the constant', () => {
    expect(COCKPIT_QUERY).toBe(`(min-width: ${COCKPIT_MIN_WIDTH}px)`);
  });

  it("tailwind's cockpit screen matches", () => {
    const config = read('tailwind.config.js');
    const match = /cockpit:\s*'(\d+)px'/.exec(config);
    expect(match, "no `cockpit: '<n>px'` screen in tailwind.config.js").not.toBeNull();
    expect(Number(match?.[1])).toBe(COCKPIT_MIN_WIDTH);
  });

  it('every wide media query in index.css matches', () => {
    const css = read('src/ui/index.css');
    const widths = [...css.matchAll(/@media \(min-width: (\d+)px\)/g)].map((m) => Number(m[1]));
    // Two tiers are in play: the tablet grid at 768 and the cockpit. Anything
    // above the tablet breakpoint is meant to be the cockpit.
    const wide = widths.filter((w) => w > 768);
    expect(wide.length, 'expected the three cockpit media queries').toBe(3);
    for (const w of wide) expect(w).toBe(COCKPIT_MIN_WIDTH);
  });

  it('App.tsx does not hardcode a width of its own', () => {
    // It used to read `matchMedia('(min-width: 1180px)')` inline, which is how
    // the breakpoint came to exist in four places. The point of breakpoints.ts
    // is that this cannot come back without failing here.
    const app = read('src/ui/App.tsx');
    expect(app).not.toMatch(/matchMedia\(\s*'\(min-width/);
    expect(app).not.toMatch(new RegExp(`${COCKPIT_MIN_WIDTH}`));
    expect(app).toContain('watchCockpit');
  });
});

/**
 * A stand-in for MediaQueryList. The real one cannot be driven from a test —
 * and, as it turns out, cannot be driven from the browser harness either:
 * CDP viewport emulation flips `matches` without emitting `change`.
 */
function fakeQuery(matches: boolean) {
  const listeners = new Set<(e: { matches: boolean }) => void>();
  return {
    matches,
    addEventListener: (_: 'change', l: (e: { matches: boolean }) => void) => { listeners.add(l); },
    removeEventListener: (_: 'change', l: (e: { matches: boolean }) => void) => { listeners.delete(l); },
    /** Test-only: pretend the viewport crossed the breakpoint. */
    cross(now: boolean) { for (const l of [...listeners]) l({ matches: now }); },
    get listenerCount() { return listeners.size; },
  };
}

describe('watchCockpit', () => {
  it('follows the viewport while the player has not intervened', () => {
    const seen: boolean[] = [];
    const mq = fakeQuery(false);
    watchCockpit((v) => seen.push(v), () => false, mq);
    mq.cross(true);
    mq.cross(false);
    expect(seen).toEqual([true, false]);
  });

  it('stops once the player has toggled it themselves', () => {
    // The failure this prevents: collapsing the panel deliberately, then
    // widening the window and having it reopen underneath you.
    const seen: boolean[] = [];
    let touched = false;
    const mq = fakeQuery(false);
    watchCockpit((v) => seen.push(v), () => touched, mq);
    mq.cross(true);
    touched = true;
    mq.cross(false);
    mq.cross(true);
    expect(seen).toEqual([true]);
  });

  it('reads the touched flag per event rather than closing over it', () => {
    // `isTouched` is a callback for exactly this reason. Passing a boolean
    // would have captured `false` at subscribe time and never updated.
    const seen: boolean[] = [];
    let touched = true;
    const mq = fakeQuery(false);
    watchCockpit((v) => seen.push(v), () => touched, mq);
    mq.cross(true);
    touched = false;
    mq.cross(true);
    expect(seen).toEqual([true]);
  });

  it('unsubscribes, so a remount does not stack listeners', () => {
    const mq = fakeQuery(false);
    const stop = watchCockpit(() => {}, () => false, mq);
    expect(mq.listenerCount).toBe(1);
    stop();
    expect(mq.listenerCount).toBe(0);
  });

  it('is a no-op where there is no matchMedia', () => {
    // This module is imported by tests running under node.
    expect(() => watchCockpit(() => {}, () => false)()).not.toThrow();
  });
});
