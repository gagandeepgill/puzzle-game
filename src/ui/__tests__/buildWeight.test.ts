/**
 * The design sources must not reach the build.
 *
 * `public/assets/pixel/hud-sources/` holds the ten sheets the pixel art is
 * cropped from, 11MB of them, and Vite copies `public/` verbatim with no
 * tree-shaking. They have now shipped twice by accident, once at 1.8MB and
 * once at 10.6MB against a 2MB site, and both times the only symptom was a
 * bigger download — nothing broke, no test failed, and the second one was
 * live before anyone noticed.
 *
 * The Vite plugin that drops them is what stops it. This is what fails when
 * that plugin is removed, renamed, or stops matching the directory.
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const root = new URL('../../../', import.meta.url);
const dist = new URL('dist/', root);

/** Total bytes under a directory. */
function weigh(dir: URL): number {
  if (!existsSync(dir)) return 0;
  return readdirSync(dir, { withFileTypes: true }).reduce((sum, e) => (
    e.isDirectory()
      ? sum + weigh(new URL(`${e.name}/`, dir))
      : sum + statSync(new URL(e.name, dir)).size
  ), 0);
}

describe('build weight', () => {
  const built = existsSync(dist);

  it.runIf(built)('does not ship the source sheets', () => {
    expect(
      existsSync(new URL('assets/pixel/hud-sources/', dist)),
      'the hud-sources sheets are in dist/. The drop-hud-sources plugin in '
      + 'vite.config.ts is what removes them; check it still matches the path.',
    ).toBe(false);
  });

  it.runIf(built)('keeps the whole site under 4MB', () => {
    // 2.0MB today. The ceiling is loose on purpose: it is here to catch a
    // sheet or a pack landing in public/, not to police normal growth.
    const mb = weigh(dist) / 1024 / 1024;
    expect(Number(mb.toFixed(2)), `dist/ is ${mb.toFixed(2)}MB`).toBeLessThan(4);
  });

  it('keeps the sources in the repo', () => {
    // The other half of the rule: out of the build, but never deleted.
    const sources = new URL('public/assets/pixel/hud-sources/', root);
    expect(existsSync(sources), 'the design sources are gone').toBe(true);
    expect(readdirSync(sources).length).toBeGreaterThanOrEqual(9);
  });
});
