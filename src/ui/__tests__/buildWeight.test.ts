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
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const root = new URL('../../../', import.meta.url);
const config = readFileSync(new URL('vite.config.ts', root), 'utf8');

describe('build weight', () => {
  it('has a build step that keeps the source sheets out of dist', () => {
    // Asserted against the config rather than against dist/. The deploy runs
    // `npm test && npm run build`, so anything here reading dist/ is reading
    // the *previous* build — on a cached one that is a different site, and a
    // first version of this failed the deploy for exactly that reason.
    expect(config).toContain("name: 'drop-hud-sources'");
    expect(config).toContain('assets/pixel/hud-sources');
  });

  it('keeps the sources in the repo', () => {
    // The other half of the rule: out of the build, but never deleted.
    const sources = new URL('public/assets/pixel/hud-sources/', root);
    expect(existsSync(sources), 'the design sources are gone').toBe(true);
    expect(readdirSync(sources).length).toBeGreaterThanOrEqual(9);
  });
});
