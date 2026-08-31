import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import './index.css';

const root = document.getElementById('root');
if (!root) throw new Error('No #root element');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/*
 * The worker lives one level up, next to the vanilla games, so it covers the
 * whole arcade rather than only this app. Registering after load keeps it off
 * the critical path — offline support is not worth delaying first paint.
 *
 * import.meta.env.DEV guards it because a worker registered against the Vite
 * dev server caches module URLs that stop existing on the next restart, and
 * you then debug the cache instead of the code.
 */
if ('serviceWorker' in navigator && !import.meta.env.DEV) {
  addEventListener('load', () => {
    navigator.serviceWorker.register('../sw.js').catch(() => {
      // No offline support this visit. The game still works.
    });
  });
}
