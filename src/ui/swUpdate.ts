/**
 * Service worker update flow.
 *
 * `public/sw.js` deliberately does not call `skipWaiting()`, and the reason is
 * good: swapping the app shell out from under someone mid-run would lose their
 * game. But nothing completed the other half of that decision. A new worker
 * installed, moved to `waiting`, and stayed there — because a waiting worker
 * only activates once every tab on the origin has closed, and an installed PWA
 * on a phone is suspended rather than closed. A player could sit on a months
 * old build with nothing on screen to say so.
 *
 * So: detect the waiting worker, tell the player, and let them choose when.
 * The choice is theirs precisely because the original decision was about not
 * taking it from them.
 *
 * The logic lives here rather than in a component for the same reason
 * `watchCockpit` does — it is event plumbing that cannot be driven from a
 * browser test, so it is written against interfaces a fake can satisfy.
 */

/** The slice of ServiceWorker this module uses. */
export interface WaitingWorker {
  postMessage(message: unknown): void;
}

/** The slice of ServiceWorkerRegistration this module uses. */
export interface UpdatableRegistration {
  readonly waiting: WaitingWorker | null;
  readonly installing: { readonly state: string; addEventListener(type: 'statechange', listener: () => void): void } | null;
  addEventListener(type: 'updatefound', listener: () => void): void;
}

/** The message `public/sw.js` listens for. Shared so the two cannot drift. */
export const SKIP_WAITING = 'payload:skip-waiting';

/**
 * Call `onWaiting` once a new worker is installed and waiting to take over.
 *
 * Covers both orders this can happen in, which is the part that is easy to get
 * wrong: the worker may already be waiting when the page loads (the update
 * downloaded on a previous visit), or it may arrive later via `updatefound`.
 * Handling only the second means a player who reloaded once never sees the
 * prompt again.
 *
 * Fires at most once. A second prompt for the same waiting worker is noise.
 */
export function onUpdateReady(
  registration: UpdatableRegistration,
  onWaiting: (worker: WaitingWorker) => void,
): void {
  let fired = false;
  const fire = (worker: WaitingWorker | null) => {
    if (fired || !worker) return;
    fired = true;
    onWaiting(worker);
  };

  // Already waiting: the update landed on an earlier visit.
  fire(registration.waiting);

  registration.addEventListener('updatefound', () => {
    const installing = registration.installing;
    if (!installing) return;
    installing.addEventListener('statechange', () => {
      // `installed` rather than `activated`: without skipWaiting it never
      // reaches `activated` on its own, which is the whole problem.
      if (installing.state === 'installed') fire(registration.waiting);
    });
  });
}

/**
 * Get a registration, whether or not one exists yet.
 *
 * `main.tsx` registers inside a `load` listener, and React commits its effects
 * before `load` fires on a page still fetching fonts. So on a cold first visit
 * the order is: React mounts, the effect calls `getRegistration()`, that
 * resolves `undefined`, `load` fires, registration happens, and nobody is
 * listening. It only appeared to work because every visit after the first has
 * a registration already.
 *
 * `ready` covers the gap. It resolves once a worker is active, which is
 * exactly the moment there is something to subscribe to. It never resolves
 * when the page has no worker at all, which is correct: there is nothing to
 * announce, and the caller's cancel flag stops the pending promise doing
 * anything on unmount.
 */
export async function resolveRegistration<R>(container: {
  getRegistration(): Promise<R | undefined>;
  readonly ready: Promise<R>;
}): Promise<R> {
  return (await container.getRegistration()) ?? container.ready;
}

/**
 * Hand over to the waiting worker, then reload once it has taken control.
 *
 * Reloading on `controllerchange` rather than immediately: posting the message
 * only starts the handover, and reloading before it completes just serves the
 * old shell again from the old worker.
 *
 * The guard matters. `controllerchange` also fires on the very first
 * registration of a worker on a page that had none, and Chrome has historically
 * fired it more than once. Reloading unguarded is how a page ends up in a loop
 * that looks like a crash.
 */
export function activateUpdate(
  worker: WaitingWorker,
  container: { addEventListener(type: 'controllerchange', listener: () => void): void },
  reload: () => void,
): void {
  let reloading = false;
  container.addEventListener('controllerchange', () => {
    if (reloading) return;
    reloading = true;
    reload();
  });
  worker.postMessage({ type: SKIP_WAITING });
}
