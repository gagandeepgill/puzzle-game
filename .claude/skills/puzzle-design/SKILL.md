---
name: puzzle-design
description: 'Design principles for this repo''s genre — daily puzzles, engine-builder runs, and the rules that make compounding scores feel earned rather than arbitrary. Use when adding a part, tuning a quota curve, designing a boss twist, changing what a draft offers, or judging whether a proposed mechanic is actually fun.'
---

# Designing for this arcade

Distilled from research into Balatro, Slay the Spire, Into the Breach, Wordle, NYT Connections, the Nikoli catalogue, and the broughlike tradition. These are the principles that survived contact with an actual play-through audit of Payload.

## The one that decides everything

**The player must be able to form a hypothesis, commit to it, and see it confirmed.**

A game that fails this reads as a slot machine no matter how deep it actually is. Payload's audit found exactly this failure: genuinely deep maths (a marble going `3 → 76`), and no way to predict or reconstruct it. Depth the player cannot perceive is not depth — it is noise.

Every mechanic added should be checked against this before anything else.

## Rules for the engine-builder half

**Multiplication, not addition.** Additive bonuses feel like wages; multiplication feels like an explosion. The player must *build the exponent* — that is why every factor being a decision they made is what makes a big number feel earned rather than granted.

**Escalate quotas exponentially so turtling loses.** A linear build must mathematically fail against the curve. This is what forces commitment to a strategy instead of hedging. Current curves: Easy `12/30/68/145`, Hard `10/22/48/95/190/340/600/1000`.

**Position must be a decision, not a formality.** A Coil below the Weights is worth double one above them; a Prism is worth zero unless the column to its right is loaded; a Tuning Fork is worth nothing unless it touches something. If the interface does not make that legible, the game is asking "which part" while the actual game is "which cell".

**Never let a run be starved.** `startDraft` forces a scaling part into every offer. A run that cannot win because the draft never offered a multiplier is unfair, not hard.

**Adding something must cost something.** Board space is the dilution cost — permanent placement is what makes a bad early part hurt. Preserve that; it is the Slay the Spire deck-dilution tension in spatial form.

## Rules for the daily half

**One puzzle, everyone, per UTC day.** Scarcity is the retention engine, and identical seeds are what make comparison meaningful. Details in `daily-seeded-runs`.

**Failure must be informative.** The single most-cited criticism of NYT Connections is that it invites guesses and punishes them without teaching. A wasted drop must show the player *why* it was wasted, or it teaches nothing.

**Guarantee a floor.** Any completion should preserve the streak. Punishing failure states are the genre's worst feel-bad; keep the ceiling in the score, not in whether you finish.

**Share the performance, never the board.** The solved layout is the spoiler. Share what the run felt like — score, rounds, best drop — so two people's results differ interestingly even when both won.

## Boss twists (Jams)

A good twist **attacks the build, not the player's luck**. Existing ones are the template:

- *Short Shift* — fewer drops, so per-drop output must be real.
- *Slippery* — each marble skids past its first part, which quietly turns a junk part at the top of a column into a deliberate shield. That emergent counterplay is what a good twist produces.
- *Power Cut* — Echo Bells silent.

**Never name a mechanic the player has not met.** "Echo Bells stay silent" is meaningless to someone who has never been offered one and has no way to look it up. Either gate the twist on the part existing, or ship a compendium.

## Tuning method

Never claim balance from inspection. Use two bots (`verify-puzzle-game` has the harness):

- A **lazy** bot — skips drafts, drops into empty columns — **must lose**. If it wins, the curve is too soft.
- A **competent** bot — drafts scalers, stacks a column — **must win Easy** and get close on Hard.

Bots systematically underuse Prism catcher columns and Spring loops, so read their results as the pessimistic bound and leave that headroom in.

## Difficulties are different games, not one truncated

Easy and Hard deliberately share **no round**: different length, drops, starting machine, pools, jams, blueprint cadence, and a daily seed salted per difficulty so they never deal the same parts on the same day. "Easy is Hard cut short" was explicitly rejected — keep it that way.

## Judging a proposed mechanic

Ask in order:

1. Can the player *see* its consequence before committing? If not, can that be fixed cheaply? If not, reject it.
2. Does it interact with at least two existing parts? Isolated mechanics add rules without adding depth.
3. Does it make position matter more, or less?
4. Can a bot verify it did not break the quota curve?
5. Is it legible at cell size on a phone, and without colour alone?
