import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.js';
import { UpdateBar } from './UpdateBar.js';
import './index.css';
import './pixel/pixel.css';

const root = document.getElementById('root');
if (!root) throw new Error('No #root element');
createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

/*
 * Its own root, not a child of <App>. Two reasons: it must not re-render the
 * board, and <App> gets `inert` applied to it while the result modal is open,
 * which would make the update bar unreachable exactly when someone has
 * finished a run and is most able to take an update.
 */
const updateHost = document.createElement('div');
document.body.appendChild(updateHost);
createRoot(updateHost).render(
  <StrictMode>
    <UpdateBar />
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
