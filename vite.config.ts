import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The whole site is one build output.
//
// public/ holds the hand-authored half — the hub, Ledger Lane, the service
// worker, the manifest and the icons — which Vite copies into dist/ verbatim.
// Payload's entry is app/index.html, so it emits to dist/app/. Nothing in the
// repo is a folder pretending to be a website; dist/ is the website.
export default defineConfig({
  plugins: [react()],
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
