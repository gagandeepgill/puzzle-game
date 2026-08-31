# Payload Arcade

Two original browser games shipped as one installable PWA. No backend, no
accounts, nothing stored off the player's device. Live at
https://payload-arcade.netlify.app.

- **Payload** is the flagship: a marble engine-builder. Draft parts, install them
  on a 5x6 board, drop marbles through the machine you built, beat a rising quota.
  React and TypeScript.
- **Ledger Lane** is a routing puzzle, still one self-contained HTML file.

## Layout

```
src/game/    Payload's rules. Pure TypeScript.
src/ui/      Payload's React views. Play back what the engine computed.
app/         Payload's Vite entry, emitted to dist/app/
public/      hand-authored, copied into dist/ verbatim:
             index.html (the arcade hub), ledger.html, sw.js, manifest, icons
dist/        the site. Built, gitignored, published by Netlify.
tools/       serve.js, which serves dist/ at :8000
docs/        PLATFORM.md, and adr/ for decisions that were argued out
.claude/     skills, and settings.json for plugins
```

`public/payload.html` is the **superseded single-file build of Payload**. It is
kept only as the reference `src/game/__tests__/parity.test.ts` diffs against. It
is not the game the hub links to. Do not edit it to change the game, and do not
verify against it.

## The rule that shapes everything

`src/game/` must not know a renderer exists. No React, no `document`, no
`window`. CI greps for it and fails the build.

The engine decides what happened and returns an ordered event log; the view
decides how fast to show it. That seam is why the drop breakdown, the skip
control, the frame-by-frame marble playback and the placement preview were all
cheap, and it is what would let a server re-derive a score from a move list.

If a change to the engine requires touching the renderer, the seam is in the
wrong place.

## Commands

```bash
npm ci
npm test           # 124 tests
npm run typecheck
npm run build      # public/ + app/ -> dist/
node tools/serve.js   # serves dist/ at http://localhost:8000
npm run dev        # Vite with hot reload at :5173
```

`dist/` is stale until `npm run build` runs. A change you just made to `src/`
will not be on screen until then, and that is the most common way to conclude a
fix did not work when it did.

## Two traps that will cost you time

The **service worker returns a build you already replaced**. After a rebuild,
clear it before believing what you see:

```js
const rs = await navigator.serviceWorker.getRegistrations();
await Promise.all(rs.map(r => r.unregister()));
const ks = await caches.keys();
await Promise.all(ks.map(k => caches.delete(k)));
location.reload();
```

The **browser pane throttles background timers**. When it is hidden,
`requestAnimationFrame` never fires and `setTimeout` is clamped to about a
second, so any measurement built on either will hang or report nonsense. Front
the tab, or measure the pure function in Node.

## Workflow

Never commit to `main`. Branch, commit, push, open a PR, then self-review it by
reading the diff back against the tree. Merging is the owner's call.

Merging to `main` builds and publishes on its own. PRs get a Netlify deploy
preview, which is worth handing over when a change needs to be felt rather than
described.

Work you find but do not do goes in the tracker before the session ends, not
into chat where it dies with the scrollback.

## Writing

Everything written here posts under the owner's name and should read as his: no
`Co-Authored-By` trailers, no "Generated with Claude Code" lines, no tooling
signatures, anywhere. That includes commit messages, PR bodies, issues, docs and
code comments.

Avoid the house style of LLM prose: em-dash asides in every other sentence,
bolding for emphasis throughout, tables where two sentences would do, "genuinely
/ actually / precisely / notably" as intensifiers, "not X, but Y" parallelism,
rhetorical questions as transitions, emoji in headings. Short declarative
sentences. Give the number instead of the adjective.

## Where the detail lives

Skills in `.claude/skills/` load themselves when relevant, so do not restate them
here. `payload-engine` maps the simulation and its invariants, `daily-seeded-runs`
covers seeding and streaks, `puzzle-design` covers whether a mechanic is fun,
`verify-puzzle-game` covers running and bot-playing a build, `game-feel` and
`game-typography` cover how it should feel and read.

`MASTER_PROMPT.md` is a spec for an unbuilt React Native version of Ledger Lane,
written before any code existed. Read it as a proposal, not a description of this
repo.
