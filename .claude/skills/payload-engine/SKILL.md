---
name: payload-engine
description: 'Map of the Payload engine-builder — the marble simulation loop, how parts/blueprints/jams/difficulties are declared, and the invariants that keep runs deterministic and fair. Use when adding or changing a part, blueprint, jam, difficulty or quota, when a drop scores wrong, or when marbles animate out of sync with what actually fired.'
---

# The Payload engine

One file: `site/payload.html` (edit the scratchpad fragment, regenerate the repo copy —
see [verify-puzzle-game](../verify-puzzle-game/SKILL.md)). No framework, no build.

## The shape of a run

`startRun(mode, diffKey)` → `startDraft()` → player places a part → `drop(col)` →
`runMarble()` per marble → `roundWon()` or `runLost()` → `finishRun()` shows the modal.

State lives in one object `S`. The pieces that matter:

| Field | Meaning |
|---|---|
| `S.mode` | `'daily'` (seeded, recorded) or `'free'` (unseeded) |
| `S.diff` | a `DIFFS` entry — owns rounds, quotas, drops, start board, jams, pools |
| `S.variant` | daily-only rule twist from `VARIANTS`, rotates by day number |
| `S.rng` | `mulberry32(seed)` in daily, `Math.random` in free play |
| `S.board` | flat array, `idx(r,c) = r*COLS + c`, values are part keys or `null` |

Read config through the helpers, never the raw arrays: `rounds()`, `quotaFor(i)`,
`dropsForRound()`, `jamFor(i)`, `baseValue()`, `springLimit()`. They fold in the
difficulty AND the daily variant; touching `S.diff.quotas` directly skips the variant
multiplier and silently desyncs the HUD from the win check.

## The simulation loop (`runMarble`)

A marble is `{ v, col, row, touched, reso, slipped, springs }` and walks **down one row
per tick**, triggering whatever part it lands on. It is a `while` loop with an
`await sleep(92)` per step, so simulation and animation advance together — there is no
separate render pass.

Adding a part means one `else if` branch. The contract for a branch:

- Mutate `m.v` (and `c` if it deflects, `r` if it moves vertically).
- Call `fxLabel(r, c, text, color)` so the player *sees* what fired. A part that changes
  the score without a label reads as a bug.
- Respect `const k = doubled ? 2 : 1` — `isForked()` says a Tuning Fork is adjacent, and
  every part is expected to double its effect. Fork doubling does not stack.
- To spawn a marble, push onto `queue` guarded by `stats.marbles < MARBLE_CAP` and copy
  scalars, `springs: new Map(m.springs)`.

**Order of operations along the path is the whole strategy.** Adds before a Prism get
duplicated; a Coil after a merge multiplies everything. Do not "helpfully" reorder
resolution — the geometry the player built is the hand they played.

### Invariants — breaking these breaks the game

1. **Resolution is deterministic.** No `Math.random()` inside a drop, ever. The same
   machine plus the same drop column must always pay the same. All randomness lives in
   drafting, through `S.rng`.
2. **A split copy starts at the prism, not the top.** `m.row` is where it enters, and
   `runMarble` anchors its spawn at `startRow - 1`. This was a real bug: copies drawn
   from the top of the column appeared to fall through parts that (correctly) never
   fired, and it read as "tiles don't register".
3. **Every trigger is visible.** Flash the cell, float a label, blip.
4. **The player is never multiplier-starved.** `startDraft` forces a `SCALERS` member
   into every offer. An unwinnable run is unfair, not hard.
5. **`moveCount`/score updates are logical, animation is cosmetic.** Input is never
   blocked waiting on a tween.

## Declaring content

**Part** — add to `TILES` (`g` glyph, `n` name, `mini` badge, `r` rule text), add the
branch in `runMarble`, then add the key to the difficulty `pools` rounds where it should
appear. A part absent from every pool is dead content.

**Blueprint** (permanent run-wide rule) — add to `BLUEPRINTS`, then read it wherever it
applies (`S.blueprints.has('gravity')`). Granted after rounds listed in
`S.diff.blueprintAfter`.

**Jam** (boss twist) — declare on the difficulty as `{ key, text }` under a round index,
then honour `key` where it bites: `dropsForRound()` for `shortShift`, `drop()` for
`noBells`, `runMarble()` for `slippery`. Jams are keyed by name, never by round index —
the same jam appears at different rounds in different difficulties.

**Difficulty** — a `DIFFS` entry is a complete run definition. Easy and Hard deliberately
**share no round**: different length, drops, starting machine, pools, jams, blueprint
cadence, and a daily seed salted with the difficulty key so the two never deal the same
parts on the same day. Keep it that way — "Easy is Hard truncated" was explicitly
rejected.

## Balance

Quotas roughly double per round; that curve is what forces multiplicative builds. When
you change it, re-run both bots (lazy must lose, competent must win Easy) and quote the
actual numbers. Current shape: Easy `12/30/68/145` over 4 rounds with 4 drops; Hard
`10/22/48/95/190/340/600/1000` over 8 rounds with 3 drops.

Balance is tuned from bot runs, which underplay Prism catchers and Spring loops — treat
bot results as the pessimistic bound, not the truth.
