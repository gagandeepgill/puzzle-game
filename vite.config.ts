import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The app builds to demo/app/, so the existing PWA shell and service worker
// keep serving the vanilla games while the port runs alongside them.
export default defineConfig({
  plugins: [react()],
  base: './',
  build: { outDir: 'demo/app', emptyOutDir: true },
  server: { port: 5173 },
});
