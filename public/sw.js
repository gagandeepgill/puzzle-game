/*
 * Payload Arcade service worker.
 *
 * The games are self-contained static files with no backend, so the whole app
 * shell is precached and served cache-first — once installed, everything works
 * offline forever, including on a plane.
 *
 * CACHE_VERSION is stamped at build time from the hash of the emitted app
 * bundle, so it changes exactly when the app changes. It used to be a literal
 * with a comment asking whoever deployed to remember; it read 'v3' from the
 * day it was written until the day this replaced it, across every deploy in
 * between. An unchanged version means an unchanged sw.js, which means the
 * browser sees no new worker, which means the update prompt never fires.
 *
 * The new worker installs in the background and takes over only once every tab
 * is closed; it deliberately does NOT call skipWaiting(), because swapping the
 * shell out from under someone mid-run would lose their game.
 */
const CACHE_VERSION = '__SW_VERSION__';
const SHELL_CACHE = `arcade-shell-${CACHE_VERSION}`;
const FONT_CACHE = `arcade-fonts-${CACHE_VERSION}`;

const SHELL = [
  '.',
  'index.html',
  'payload.html',
  'ledger.html',
  // The React port. Its JS and CSS carry build hashes that change every
  // deploy, so they cannot be listed here; they are picked up by the runtime
  // cache below on first visit, which is the same visit that loads this page.
  'app/index.html',
  'manifest.webmanifest',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/icon-maskable-512.png',
  'icons/apple-touch-icon.png',
  'icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE).then((cache) =>
      // Individual adds: one 404 shouldn't fail the whole install.
      Promise.all(SHELL.map((url) => cache.add(url).catch(() => {})))
    )
  );
});

/*
 * The other half of not calling skipWaiting() on install.
 *
 * A waiting worker only takes over once every tab on the origin closes, and
 * an installed PWA on a phone is suspended rather than closed — so without
 * this a player could sit on a months old build forever. The page detects the
 * waiting worker, tells them, and posts this message only when they say so.
 * The decision stays theirs, which is the point of not doing it on install.
 */
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'payload:skip-waiting') self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== SHELL_CACHE && k !== FONT_CACHE)
            .map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

const isFont = (url) =>
  url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com';

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Google Fonts: stale-while-revalidate so type still renders offline.
  if (isFont(url)) {
    event.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        const fetching = fetch(request)
          .then((res) => {
            if (res.ok || res.type === 'opaque') cache.put(request, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit || fetching;
      })
    );
    return;
  }

  if (url.origin !== self.location.origin) return;

  /*
   * Navigations: network first, cache as the offline fallback.
   *
   * This was cache-first, and that is what stopped every returning player
   * receiving updates. A page is the document that names the hashed bundles;
   * serving a cached one hands back the old filenames, whose contents are also
   * cached, so the app pins itself to the build a visitor first saw. New
   * deploys landed and nobody downstream ever saw one.
   *
   * The hashed assets below stay cache-first, which is safe precisely because
   * their names change with their contents. Only the document has to be fresh.
   */
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(SHELL_CACHE).then((c) => c.put(request, copy));
          }
          return res;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match('index.html')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((hit) =>
      hit || fetch(request).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(SHELL_CACHE).then((c) => c.put(request, copy));
        }
        return res;
      })
    )
  );
});
