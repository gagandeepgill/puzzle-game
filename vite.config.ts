import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// One source of truth for the version the footer prints, rather than a
// literal in a component that drifts from the manifest the day it is bumped.
const { version } = JSON.parse(readFileSync('./package.json', 'utf8')) as { version: string };

// The whole site is one build output.
//
// public/ holds the hand-authored half — the hub, Ledger Lane, the service
// worker, the manifest and the icons — which Vite copies into dist/ verbatim.
// Payload's entry is app/index.html, so it emits to dist/app/. Nothing in the
// repo is a folder pretending to be a website; dist/ is the website.
export default defineConfig({
  plugins: [
    react(),
    /**
     * Keep the design sources in the repo and out of the build.
     *
     * `public/assets/pixel/hud-sources/` holds the ten sheets the pixel art is
     * cropped from. They belong beside the crops, which is why they live under
     * `public/`, but Vite copies that directory verbatim with no
     * tree-shaking, and nothing in the app requests a sheet: they are
     * 1448x1086 contact sheets and what the game draws with is cropped out of
     * them into `hud/`. Left in, they were 10.6MB of an 13MB build.
     *
     * Dropped after the copy rather than excluded from it, because
     * `publicDir` is all-or-nothing.
     */
    {
      name: 'drop-hud-sources',
      apply: 'build' as const,
      closeBundle() {
        rmSync('dist/assets/pixel/hud-sources', { recursive: true, force: true });
      },
    },
    /**
     * Stamp the service worker's cache version from the emitted bundle.
     *
     * `sw.js` is copied out of `public/` verbatim, so a literal version in it
     * only changes when somebody remembers. Nobody did: it read 'v3' across
     * every deploy from the day it was written, which meant the file was
     * byte-identical each time, which meant the browser never saw a new worker
     * and never offered the update. Derived from every emitted asset name
     * instead, so it changes when — and only when — the app does.
     *
     * Every asset, not just the JS bundle: those names carry Vite's content
     * hashes, and a first version of this read only `app-*.js`. Measured, a
     * CSS-only change left the stamp identical, and this whole skin is mostly
     * CSS — so the fix would not have covered the changes it was written for.
     */
    {
      name: 'stamp-sw-version',
      apply: 'build' as const,
      closeBundle() {
        const assets = readdirSync('dist/assets').filter((f) => /-[A-Za-z0-9_-]{6,}./.test(f));
        if (assets.length === 0) throw new Error('stamp-sw-version: no hashed assets in dist/assets');
        const stamp = createHash('sha256').update(assets.sort().join('|')).digest('hex').slice(0, 12);
        const sw = 'dist/sw.js';
        const src = readFileSync(sw, 'utf8');
        if (!src.includes('__SW_VERSION__')) {
          throw new Error('stamp-sw-version: no __SW_VERSION__ token in sw.js');
        }
        writeFileSync(sw, src.replace('__SW_VERSION__', stamp));
      },
    },
  ],
  define: { __APP_VERSION__: JSON.stringify(version) },
  // Relative, so the same build works at a domain root and under a subpath.
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Relative to the project root. Vite resolves it, and the emitted HTML
    // keeps that path, which is what puts Payload at /app/.
    rollupOptions: { input: { app: 'app/index.html' } },
  },
  server: { port: 5173 },
});
