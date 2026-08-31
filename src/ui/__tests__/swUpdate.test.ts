/**
 * The update flow, against fakes.
 *
 * There is no way to drive this from the browser pane: it refuses to register
 * a service worker at all (verified — a valid same-origin script served 200
 * with `text/javascript` fails with "An unknown error occurred when fetching
 * the script", and a `blob:` worker is rejected too). Even in a real browser
 * it needs two deploys to exercise. So the ordering rules are tested directly,
 * which is where the bugs live anyway.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { SKIP_WAITING, activateUpdate, onUpdateReady, resolveRegistration } from '../swUpdate.js';
import type { UpdatableRegistration, WaitingWorker } from '../swUpdate.js';

function fakeWorker(): WaitingWorker & { messages: unknown[] } {
  const messages: unknown[] = [];
  return { messages, postMessage: (m) => { messages.push(m); } };
}

function fakeRegistration(initialWaiting: WaitingWorker | null = null) {
  const updateFound: Array<() => void> = [];
  const stateChange: Array<() => void> = [];
  const reg = {
    waiting: initialWaiting,
    installing: null as UpdatableRegistration['installing'],
    addEventListener: (_: 'updatefound', l: () => void) => { updateFound.push(l); },
    /** Test-only: a new worker starts installing, then finishes. */
    downloadUpdate(worker: WaitingWorker) {
      const installing = {
        state: 'installing',
        addEventListener: (_: 'statechange', l: () => void) => { stateChange.push(l); },
      };
      reg.installing = installing;
      for (const l of [...updateFound]) l();
      installing.state = 'installed';
      reg.waiting = worker;
      for (const l of [...stateChange]) l();
    },
  };
  return reg;
}

describe('onUpdateReady', () => {
  it('fires for a worker that was already waiting when the page loaded', () => {
    // The update downloaded on a previous visit. Handling only `updatefound`
    // means a player who reloads once never sees the prompt again — this is
    // the case that gets forgotten.
    const worker = fakeWorker();
    const seen: WaitingWorker[] = [];
    onUpdateReady(fakeRegistration(worker) as unknown as UpdatableRegistration, (w) => seen.push(w));
    expect(seen).toEqual([worker]);
  });

  it('fires when an update arrives during this session', () => {
    const reg = fakeRegistration();
    const seen: WaitingWorker[] = [];
    onUpdateReady(reg as unknown as UpdatableRegistration, (w) => seen.push(w));
    expect(seen).toHaveLength(0);
    const worker = fakeWorker();
    reg.downloadUpdate(worker);
    expect(seen).toEqual([worker]);
  });

  it('fires at most once', () => {
    // A second bar for the same waiting worker is noise, and `statechange`
    // can be delivered more than once.
    const reg = fakeRegistration();
    const seen: WaitingWorker[] = [];
    onUpdateReady(reg as unknown as UpdatableRegistration, (w) => seen.push(w));
    reg.downloadUpdate(fakeWorker());
    reg.downloadUpdate(fakeWorker());
    expect(seen).toHaveLength(1);
  });

  it('does not fire while the new worker is still installing', () => {
    // Prompting at `updatefound` offers a reload to a worker that has not
    // finished downloading, which reloads onto the old shell.
    const reg = fakeRegistration();
    const seen: WaitingWorker[] = [];
    onUpdateReady(reg as unknown as UpdatableRegistration, (w) => seen.push(w));
    reg.installing = {
      state: 'installing',
      addEventListener: () => {},
    };
    expect(seen).toHaveLength(0);
  });
});

describe('activateUpdate', () => {
  it('asks the worker to take over, then reloads once it has', () => {
    const worker = fakeWorker();
    const listeners: Array<() => void> = [];
    const container = { addEventListener: (_: 'controllerchange', l: () => void) => { listeners.push(l); } };
    const reload = vi.fn();

    activateUpdate(worker, container, reload);
    expect(worker.messages).toEqual([{ type: SKIP_WAITING }]);
    // Not yet: reloading before the handover completes just serves the old
    // shell again from the old worker.
    expect(reload).not.toHaveBeenCalled();

    for (const l of listeners) l();
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('reloads only once however many times controllerchange fires', () => {
    // Chrome has historically fired this more than once. Unguarded, that is a
    // reload loop, which reads to a player as a crash.
    const listeners: Array<() => void> = [];
    const container = { addEventListener: (_: 'controllerchange', l: () => void) => { listeners.push(l); } };
    const reload = vi.fn();
    activateUpdate(fakeWorker(), container, reload);
    for (const l of listeners) { l(); l(); l(); }
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('uses the message string the worker actually listens for', () => {
    // The constant is exported so sw.js and this cannot drift apart. If the
    // literal in public/sw.js changes, this is what fails.
    const sw = readFileSync(new URL('../../../public/sw.js', import.meta.url), 'utf8');
    expect(sw).toContain(`'${SKIP_WAITING}'`);
    expect(sw).toContain('self.skipWaiting()');
  });
});

describe('resolveRegistration', () => {
  it('uses the registration that already exists', async () => {
    const existing = { id: 1 };
    const never = new Promise<typeof existing>(() => {});
    const reg = await resolveRegistration({
      getRegistration: () => Promise.resolve(existing),
      ready: never,
    });
    expect(reg).toBe(existing);
  });

  it('waits for `ready` when registration has not happened yet', async () => {
    // The cold-visit order: React commits its effects before main.tsx's
    // `load` listener registers anything, so getRegistration resolves
    // undefined. A bare getRegistration() would subscribe to nothing and the
    // bar would never appear on a first visit.
    const late = { id: 2 };
    const reg = await resolveRegistration({
      getRegistration: () => Promise.resolve(undefined),
      ready: Promise.resolve(late),
    });
    expect(reg).toBe(late);
  });
});
