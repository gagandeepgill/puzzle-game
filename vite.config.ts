import { readFileSync, rmSync } from 'node:fs';
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
