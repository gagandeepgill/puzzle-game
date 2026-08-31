import { useEffect, useState } from 'react';
import { activateUpdate, onUpdateReady, resolveRegistration } from './swUpdate.js';
import type { WaitingWorker } from './swUpdate.js';

/**
 * "A new version is ready" — and nothing else.
 *
 * Mounted from `main.tsx` into its own container rather than from `App`, so it
 * cannot re-render the board and cannot end up inside the `inert` subtree the
 * result modal creates.
 *
 * It never reloads on its own. `public/sw.js` refuses to `skipWaiting()`
 * because losing a run to an update is worse than running an old build for
 * another hour, and a bar that reloaded itself would hand back exactly the
 * problem that decision avoided. Dismiss is a real option: the update stays
 * waiting and arrives on the next natural reload.
 *
 * Built on the same four surface tiers as everything else — `panel-lit` for the
 * housing, `raised` for what you press, `sunk` while pressed. It is the newest
 * surface in the app and would otherwise have been the only flat one.
 */
export function UpdateBar() {
  const [worker, setWorker] = useState<WaitingWorker | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    let cancelled = false;
    // Not a bare getRegistration(): on a cold first visit this effect runs
    // before main.tsx's `load` listener has registered anything, so it would
    // resolve undefined and never subscribe.
    void resolveRegistration(navigator.serviceWorker).then((reg) => {
      if (cancelled) return;
      onUpdateReady(reg, (w) => { if (!cancelled) setWorker(w); });
    });
    return () => { cancelled = true; };
  }, []);

  if (!worker || dismissed) return null;

  return (
    <div
      role="status"
      className="fixed left-1/2 -translate-x-1/2 bottom-4 z-50 w-[min(26rem,calc(100vw-1.25rem))]
                 bg-panel-lit border border-brass rounded-xl shadow-panel px-3 py-2.5
                 flex items-center gap-2"
      style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
    >
      <p className="flex-1 text-body text-ink">
        A new version is ready.
        <span className="block text-meta text-steel">
          Finish your run first — this won't reload on its own.
        </span>
      </p>
      <button
        type="button"
        disabled={applying}
        onClick={() => {
          setApplying(true);
          activateUpdate(worker, navigator.serviceWorker, () => location.reload());
        }}
        className="text-body font-bold text-[#241a05] bg-machined-brass rounded-[9px] px-3 min-h-[38px]
                   shadow-raised transition-[box-shadow,transform] duration-150
                   active:shadow-sunk active:translate-y-px disabled:opacity-60"
      >
        {applying ? 'Updating…' : 'Reload'}
      </button>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label="Dismiss the update notice"
        className="text-body font-semibold text-steel hover:text-ink bg-raised border border-edge
                   shadow-raised rounded-[9px] px-2.5 min-h-[38px]
                   transition-[background-color,border-color,color,box-shadow] duration-150
                   active:shadow-sunk active:translate-y-px"
      >
        Later
      </button>
    </div>
  );
}
