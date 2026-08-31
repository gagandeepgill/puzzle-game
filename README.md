# Payload Arcade

A small arcade of browser games, shipped as an installable PWA. No backend, no accounts, nothing stored off your device.

The site is one build output. `public/` holds the hand-authored half that Vite copies verbatim: the hub, Ledger Lane, the service worker, the manifest and the icons. Payload is React and TypeScript in `src/`, entered at `app/index.html`. Both land in `dist/`, which is gitignored and is what gets published.

```
src/               Payload: pure rules engine in src/game, React views in src/ui
app/index.html     Payload's entry, emitted to dist/app/
public/            hand-authored, copied to dist/ as-is
  index.html       the arcade hub
  ledger.html      Ledger Lane, still one self-contained file
  payload.html     the superseded single-file Payload, kept only as the
                   reference src/game/__tests__/parity.test.ts diffs against
dist/              the site. Built, gitignored, published.
```

```bash
npm ci
npm run build                # public/ + app/ -> dist/
node tools/serve.js          # serves dist/ at http://localhost:8000
```

`npm run dev` gives you Vite with hot reload at :5173. Use `tools/serve.js` when testing anything installable: it serves the built `dist/`, which is exactly what gets deployed, and service workers and the install prompt need http rather than `file://`. Rebuild before serving, or you are looking at the last build.

Deploying: Netlify builds from `main` and publishes `dist/`. The settings live in [`netlify.toml`](netlify.toml): `npm test && npm run build`, publish `dist`. Once installed the arcade plays fully offline, both games and fonts included.

Platform strategy and the path to the App Store are in [`docs/PLATFORM.md`](docs/PLATFORM.md).

Decisions that were argued out rather than just made live in [`docs/adr/`](docs/adr/).

## Payload

A run-based engine builder. Draft a part from three, install it on a 5x6 grid, then drop marbles down a column. Every part a marble touches changes its value. Weights add, Coils multiply, Prisms clone the marble into the next column, Springs bounce it back up to re-trigger parts, Tuning Forks double whatever sits next to them.

Quotas roughly double each round across an 8-round run, so additive builds die on the curve. The game is finding multiplier combos before it catches you.

Play: [payload-arcade.netlify.app/app/](https://payload-arcade.netlify.app/app/), built from `src/`.

Ten part types. Boss "Jam" rounds at 3 and 6. Permanent blueprint drafts: Lead Marbles, Overtime, Gravity Well, Loose Screws. A guaranteed-scaler rule so no run is starved of multipliers. Daily records and streaks, a spoiler-free share line, an in-game compendium, and a placement preview that runs the same simulation the real drop runs, so it cannot promise a score the game then does not pay.

`public/payload.html` is the older single-file build. It is kept as the reference the parity tests diff against, not as the game.

Design lineage, researched rather than copied: Balatro's multiplicative scoring and forced build commitment, Slay the Spire's draft dilution, Drop7's cascade spectacle. Resolution is deterministic, and the machine's geometry is the hand you play.

## Ledger Lane

A tap-to-rotate routing puzzle. Turn the lane arrows to connect the Vault to the Market. Coins on the route pay out, every lane charges a 5g courier fee, and any pickpocket next to your route lifts 15g, so the greedy path is usually a trap. Score is net haul against a solver-proven optimum, with taps against par as the substat.

Play: [payload-arcade.netlify.app/ledger.html](https://payload-arcade.netlify.app/ledger.html), source at [`public/ledger.html`](public/ledger.html).

Five boards from Gentle to Expert, including a width-parameterised 5x5 and a sealed-ledger mode on Hard and above where the projected total is hidden until you bank. A built-in DFS solver derives each board's optimum and par at load. All five have verified-unique optima.

[`MASTER_PROMPT.md`](MASTER_PROMPT.md) specs a React Native version of Ledger Lane with a daily mode, written before any code existed. It is a proposal, not a description of what is here: the daily machinery it describes was built for Payload instead, and Ledger Lane is still one HTML file with no daily. Its rules and design pillars have held up; the architecture from section 3 onward describes a stack this repo never adopted.

How the repo actually works, for a person or an agent picking it up, is in [`CLAUDE.md`](CLAUDE.md).
