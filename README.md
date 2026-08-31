# puzzle-game

Prototyping repo for original puzzle and engine-builder games.

## Active: Payload ⚙️

A run-based Rube Goldberg engine-builder. Draft parts (1-of-3), install them on a 5x6
machine grid, then drop marbles down a column — every part they touch mutates their
value. Weights add, Coils multiply, Prisms clone the marble into the next column,
Springs bounce it back up to re-trigger parts, Tuning Forks double whatever is adjacent.
Quotas roughly double every round across an 8-round run, so additive builds
mathematically die — the game is hunting multiplier combos before the curve catches you.

- Playable single-file demo: [`demo/payload.html`](demo/payload.html) — open in any browser.
- Systems in the demo: 10 part types, boss "Jam" twists (rounds 3 and 6), permanent
  blueprint drafts (Lead Marbles, Overtime, Gravity Well, Loose Screws), guaranteed-scaler
  draft rule, best-drop tracking, WebAudio feedback.

Design lineage (researched, not copied): Balatro's multiplicative scoring and forced
build commitment, Slay the Spire's draft dilution, Drop7's cascade spectacle — with
deterministic resolution (no RNG at drop time) and the machine's *geometry* as the hand
you play.

## On hold: Ledger Lane 🪙

A daily 4x4 arrow-rotation gold-routing puzzle. Full build spec lives in
[`MASTER_PROMPT.md`](MASTER_PROMPT.md); a playable demo is open in PR #2.
