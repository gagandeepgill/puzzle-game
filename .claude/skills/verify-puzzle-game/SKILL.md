---
name: verify-puzzle-game
description: 'Run and verify this repo''s games for real — which of them build and which are single files, how to drive a game in the browser pane, how to bot-play a full run to check balance, and the scratchpad→site→artifact publishing path. Use when asked to run, start, preview, screenshot, test or verify Payload or Ledger Lane, or to confirm a change actually works rather than only reading right.'
---

# Verifying the games

## Payload builds; everything else is a single file

This used to say there was no build step. That stopped being true when Payload
was ported to React and TypeScript.

```
src/                 Payload's source: pure engine in src/game, views in src/ui
site/app/            Payload, built from src/ — GITIGNORED, so build before serving
site/index.html      The Arcade hub
site/ledger.html     Ledger Lane — routing puzzle, still one self-contained file
site/payload.html    The superseded single-file Payload. Kept only as the
                     reference src/game/__tests__/parity.test.ts diffs against.
                     It is not the game the hub links to. Do not verify against it.
```

So:

```bash
npm ci                       # once
npm run build                # src/ -> site/app/
node tools/serve.js          # serves site/ at http://localhost:8000, the deployed layout
```

`npm run dev` gives Vite with hot reload at :5173, but the service worker, the
install prompt and anything reading `site/`'s sibling files need `tools/serve.js`.

**Rebuild before you look.** `site/app/` is stale until `npm run build` runs, so
a change you just made to `src/` will not be on screen. This is the single most
common way to conclude a fix did not work when it did.

## Driving a game from the browser pane

Payload needs the server, because it loads hashed bundles and registers a
service worker:

```
mcp__Claude_Browser__navigate → http://localhost:8000/app/
```

Ledger Lane is still one file, so `file://` works for it:

```
mcp__Claude_Browser__navigate → file:///C:/Users/Gagan/Desktop/puzzle-game/site/ledger.html
```

**The service worker will serve you a stale build.** It caches the app shell, so
after a rebuild you can reload and still see the old code. Clear it first:

```js
const rs = await navigator.serviceWorker.getRegistrations();
await Promise.all(rs.map(r => r.unregister()));
const ks = await caches.keys();
await Promise.all(ks.map(k => caches.delete(k)));
location.reload();
```

**The trap that will waste your time:** files *outside* the project folder open as a
static snapshot with JavaScript disabled, and files served from a `data:` URL have
`localStorage` disabled (reads throw `SecurityError`). Two consequences:

- Always test from a path **inside the repo**. When iterating on a scratchpad copy,
  copy it into the repo first (`cp <scratchpad>/payload.html .payload-test.html`),
  test, then **delete the temp file** before committing.
- Anything touching `localStorage` must be wrapped in try/catch. Payload's daily
  records already are — a storage failure must degrade to a playable run without
  persistence, never to a crash. Verify that path rather than assuming it.

Prefer `javascript_tool` over clicking for anything multi-step: clicks race the drop
animations, and a scripted run gives you exact numbers back.

## Bot-play a full run — this is how balance gets checked

Never claim a difficulty is tuned because the numbers look right. Play it. The house
technique is a scripted bot that drafts by preference order, places into a fixed spot
list, and waits for each drop's animation to finish:

```js
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const PREF = ['Tuning','Coil','Prism','Resonator','Spring','Copper','Weight'];
const SPOTS = [27, 17, 7, 2, 28, 22, 26, 12];        // column stack, then catcher column
const over = () => !document.getElementById('overlay').hidden;

const step = async () => {
  if (document.getElementById('draft').classList.contains('show')) {
    const cards = [...document.querySelectorAll('.dcard')];
    let card = null;
    for (const n of PREF) { card = cards.find(x => x.textContent.includes(n)); if (card) break; }
    (card || cards[0]).click(); await sleep(50);
    const spot = SPOTS.map(s => document.querySelector(`[data-cell="${s}"]`))
                      .find(c => c && c.classList.contains('placeable'));
    spot ? spot.click() : document.getElementById('skipbtn').click();
    await sleep(1400);                                  // let the quota banner clear
    return;
  }
  document.querySelectorAll('.dropbtn')[2].click();
  for (let i = 0; i < 70; i++) {                        // poll until the drop resolves
    await sleep(140);
    if (!document.querySelectorAll('.dropbtn')[2].disabled ||
        document.getElementById('draft').classList.contains('show') || over()) break;
  }
};
for (let i = 0; i < 26 && !over(); i++) await step();
```

Read the outcome from `#modal-title`, `#modal-stats`, `#modal-share`.

**Two bots, two questions.** A *lazy* bot (skip every draft, drop into an empty column)
must LOSE — if it wins, the quota curve is too soft. A *competent* bot (the one above)
must WIN Easy and get close on Hard. Both were used to tune the current numbers; keep
using both when you touch quotas, drops, or part maths.

Bots systematically underuse Prism catcher columns and Spring loops, so they read a
little pessimistically versus a thoughtful human. Leave that headroom in.

## Mobile

Games are mobile-first. Test at phone size, and reset when you are done or every later
screenshot is misleading:

```
resize_window → preset "mobile"      # 375x812
resize_window → preset "desktop"     # ALWAYS reset afterwards
```

What to actually check on mobile: the board is above the fold, the end-of-run modal is
fully inside the viewport at `scrollY === 0` (assert `rect.top >= 0 && rect.bottom <=
innerHeight` — do not eyeball it), and tap targets are ≥44px.

## Gates before you call it done

1. `read_console_messages` with `onlyErrors: true` — must be clean.
2. A full run played to its end screen, in the mode you changed.
3. If you touched daily/seeding: confirm the same day gives identical drafts across
   reloads, and that Easy and Hard differ from each other (they are salted apart).
4. If you touched quotas or part maths: both bot runs, reported with real numbers.
5. Temp test files deleted; `git status` clean apart from intended changes.

## Publishing

The scratchpad copy is a **fragment** (starts with `<title>`); the repo copy is a full
document. The wrapper is applied at build time, so never hand-edit `site/*.html` and the
scratchpad separately — edit the scratchpad, then regenerate:

```bash
SCRATCH=<scratchpad dir>
{ printf '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
  sed -n '1,2p' "$SCRATCH/payload.html"      # <title> + font <link>
  printf '</head>\n<body>\n'
  sed -n '3,$p' "$SCRATCH/payload.html"
  printf '</body>\n</html>\n'; } > site/payload.html
```

Publish the **scratchpad fragment** as the Artifact (the Artifact tool adds its own
skeleton), keeping the same `file_path` so it redeploys to the existing URL. The repo
copy and the artifact should always be regenerated from the same source in one pass.
