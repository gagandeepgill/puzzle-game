# Payload Arcade

A small arcade of original browser games, shipped as an installable PWA. Each game is
a single self-contained HTML file — no framework, no build step, no backend.

```bash
node tools/serve.js          # http://localhost:8000
```

Open [`demo/index.html`](demo/index.html) directly for quick edits, but use the server
when testing anything installable: service workers and the install prompt need
http/https and do not run from `file://`.

**Deploying:** `demo/` is published verbatim. The
[GitHub Pages workflow](.github/workflows/deploy.yml) does it on every push to `main`
(enable Pages → Source: GitHub Actions, once); [`netlify.toml`](netlify.toml) is there
as an alternative. Installed, the arcade plays fully offline — both games, fonts and
all. Platform strategy and the path to the App Store are in
[`docs/PLATFORM.md`](docs/PLATFORM.md).

## Payload ⚙️

A run-based Rube Goldberg engine-builder. Draft parts (1-of-3), install them on a 5x6
machine grid, then drop marbles down a column — every part they touch mutates their
value. Weights add, Coils multiply, Prisms clone the marble into the next column,
Springs bounce it back up to re-trigger parts, Tuning Forks double whatever is adjacent.
Quotas roughly double every round across an 8-round run, so additive builds
mathematically die — the game is hunting multiplier combos before the curve catches you.

- Play: [`demo/payload.html`](demo/payload.html)
- Systems: 10 part types, boss "Jam" twists (rounds 3 and 6), permanent blueprint drafts
  (Lead Marbles, Overtime, Gravity Well, Loose Screws), guaranteed-scaler draft rule,
  best-drop tracking, two-tap run reset, WebAudio feedback.
- Design lineage (researched, not copied): Balatro's multiplicative scoring and forced
  build commitment, Slay the Spire's draft dilution, Drop7's cascade spectacle — with
  deterministic resolution and the machine's *geometry* as the hand you play.

## Ledger Lane 🪙

A tap-to-rotate gold-routing puzzle. Turn the lane arrows to connect the Vault to the
Market; coins on the route pay out, every lane charges a 5g courier fee, and any
pickpocket adjacent to your route lifts 15g — so the greedy path is usually a trap.
Score is your net haul against a solver-proven optimum, with taps-vs-par as the substat.

- Play: [`demo/ledger.html`](demo/ledger.html)
- Five boards on a Gentle → Expert ramp, including a width-parameterized 5x5 and
  "sealed ledger" mode on Hard+ (the projected total is hidden until you bank — count
  fees and taxes yourself). A built-in DFS solver derives each board's optimum and par
  at load; all five have verified-unique optima.
- The full daily-game build spec (deterministic UTC-seeded puzzles, streaks, React
  Native architecture) lives in [`MASTER_PROMPT.md`](MASTER_PROMPT.md).
