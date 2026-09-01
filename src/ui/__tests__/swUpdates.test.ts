/**
 * The service worker has to let an update through.
 *
 * Two faults together pinned every returning visitor to the build they first
 * saw, from PR #40 until this test existed. `CACHE_VERSION` was a literal with
 * a comment asking whoever deployed to bump it, and nobody ever did, so
 * `sw.js` was byte-identical on every deploy and the browser never saw a new
 * worker to offer. And navigations were served cache-first, so even a new
 * worker would have handed back the old document, which names the old hashed
 * bundles, which were also cached.
 *
 * Nothing failed. The site deployed, the tests passed, and no player saw any
 * of it. That is why both halves are asserted here rather than trusted to a
 * comment.
 */
import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const sw = readFileSync(new URL('../../../public/sw.js', import.meta.url), 'utf8');
const dist = new URL('../../../dist/sw.js', import.meta.url);

describe('service worker updates', () => {
  it('takes its cache version from the build, not from a literal', () => {
    expect(
      sw,
      'CACHE_VERSION is hardcoded again. It has to change per build or the '
      + 'browser sees no new worker and never offers the update.',
    ).toContain("const CACHE_VERSION = '__SW_VERSION__'");
  });

  it('serves navigations network first', () => {
    // The document names the hashed bundles, so it is the one response that
    // cannot be stale. Everything else is content-addressed and safe to keep.
    const at = sw.indexOf("request.mode === 'navigate'");
    expect(at, 'the navigation branch is gone').toBeGreaterThan(-1);
    const branch = sw.slice(at, at + 700);
    expect(branch.indexOf('fetch(request)'), 'navigations fetch first')
      .toBeLessThan(branch.indexOf('caches.match'));
  });

  it('still falls back to the cache when the network is gone', () => {
    const at = sw.indexOf("request.mode === 'navigate'");
    expect(sw.slice(at, at + 700)).toContain('.catch(');
  });

  it('does not skipWaiting on install', () => {
    // Taking over mid-run would swap the shell out from under a live game.
    // The player is asked instead, which is what the message handler is for.
    // Only the install listener's own code. Two things sit between install
    // and the next listener that mention skipWaiting without calling it: the
    // message listener, which legitimately does call it, and the comment above
    // that listener explaining why install does not. So the slice stops at the
    // message listener and comments come out of what is left.
    const from = sw.indexOf("addEventListener('install'");
    const install = sw
      .slice(from, sw.indexOf("addEventListener('message'", from))
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/[^\n]*/g, '');
    expect(install).not.toContain('skipWaiting');
    expect(sw).toContain("'payload:skip-waiting'");
  });

  it.runIf(existsSync(dist))('the built worker has a real version stamped in', () => {
    const built = readFileSync(dist, 'utf8');
    expect(built, 'the token was never replaced').not.toContain('__SW_VERSION__');
    const m = /const CACHE_VERSION = '([^']+)'/.exec(built);
    expect(m?.[1], 'no version in the built worker').toBeTruthy();
    expect(m?.[1]?.length, 'the stamp looks too short to be a content hash')
      .toBeGreaterThan(4);
  });
});
