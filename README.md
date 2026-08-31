# Payload Arcade

A small arcade of browser games, shipped as an installable PWA. Each game is a single self-contained HTML file. No framework, no build step, no backend.

```bash
node tools/serve.js          # http://localhost:8000
```

Open [`demo/index.html`](demo/index.html) directly for quick edits. Use the server when testing anything installable, since service workers and the install prompt need http and don't run from `file://`.

Deploying: `demo/` is published as-is. The [GitHub Pages workflow](.github/workflows/deploy.yml) does it on every push to `main`. Enable Pages once, with Source set to GitHub Actions. [`netlify.toml`](netlify.toml) is there as an alternative. Once installed the arcade plays fully offline, both games and fonts included.

Platform strategy and the path to the App Store are in [`docs/PLATFORM.md`](docs/PLATFORM.md).

## Payload

A run-based engine builder. Draft a part from three, install it on a 5x6 grid, then drop marbles down a column. Every part a marble touches changes its value. Weights add, Coils multiply, Prisms clone the marble into the next column, Springs bounce it back up to re-trigger parts, Tuning Forks double whatever sits next to them.

Quotas roughly double each round across an 8-round run, so additive builds die on the curve. The game is finding multiplier combos before it catches you.

Play: [`demo/payload.html`](demo/payload.html)

Ten part types. Boss "Jam" rounds at 3 and 6. Permanent blueprint drafts: Lead Marbles, Overtime, Gravity Well, Loose Screws. A guaranteed-scaler rule so no run is starved of multipliers. Best-drop tracking, a two-tap run reset, WebAudio feedback.

Design lineage, researched rather than copied: Balatro's multiplicative scoring and forced build commitment, Slay the Spire's draft dilution, Drop7's cascade spectacle. Resolution is deterministic, and the machine's geometry is the hand you play.

## Ledger Lane

A tap-to-rotate routing puzzle. Turn the lane arrows to connect the Vault to the Market. Coins on the route pay out, every lane charges a 5g courier fee, and any pickpocket next to your route lifts 15g, so the greedy path is usually a trap. Score is net haul against a solver-proven optimum, with taps against par as the substat.

Play: [`demo/ledger.html`](demo/ledger.html)

Five boards from Gentle to Expert, including a width-parameterised 5x5 and a sealed-ledger mode on Hard and above where the projected total is hidden until you bank. A built-in DFS solver derives each board's optimum and par at load. All five have verified-unique optima.

The full daily-game build spec, covering deterministic UTC-seeded puzzles, streaks and the React Native architecture, is in [`MASTER_PROMPT.md`](MASTER_PROMPT.md).
