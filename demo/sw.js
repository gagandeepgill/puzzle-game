/*
 * Payload Arcade service worker.
 *
 * The games are self-contained static files with no backend, so the whole app
 * shell is precached and served cache-first — once installed, everything works
 * offline forever, including on a plane.
 *
 * Bump CACHE_VERSION on every deploy. The new worker installs in the background
 * and takes over only once every tab is closed; it deliberately does NOT call
 * skipWaiting(), because swapping the shell out from under someone mid-run would
 * lose their game.
 */
const CACHE_VERSION = 'v3';
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

  // Navigations: cache-first, falling back to the hub so a deep link still
  // opens something useful when offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      caches.match(request).then((hit) =>
        hit || fetch(request).catch(() => caches.match('index.html'))
      )
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
