---
name: daily-seeded-runs
description: 'How this repo builds Wordle-style daily puzzles — UTC date keys, deterministic seeding, rotating rule variants, first-attempt-counts records, streaks that survive being offline, and spoiler-free share payloads. Use when adding or changing a daily mode, a seed, a streak, a share string, or when a puzzle must be identical for every player on a given day.'
---

# Daily seeded runs

Both games use the same spine: the calendar date *is* the seed, so everyone in the world
gets the same puzzle without a backend. Reference implementation: the daily block at the
top of `public/payload.html`.

## The date is the identity

```js
const EPOCH = '2026-08-31';
const dateKey = new Date().toISOString().slice(0, 10);          // UTC — never getDate()
const dayNumber = Math.max(1,
  Math.round((Date.parse(dateKey) - Date.parse(EPOCH)) / 864e5) + 1);
```

`toISOString()` is what makes this UTC. Local-time date math is the classic bug here: it
gives players either side of midnight different puzzles and silently breaks streaks.
`dateKey` — not "now" — is the identity for the puzzle, the stored record, and the
streak comparison.

## Deterministic generation

FNV-1a hash into mulberry32, then route *every* random decision through it:

```js
function hashDateKey(k) {
  let h = 2166136261;
  for (let i = 0; i < k.length; i++) h = Math.imul(h ^ k.charCodeAt(i), 16777619);
  return h >>> 0;
}
function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
S.rng = mulberry32(hashDateKey(dateKey + ':' + S.diff.key));
```

**Salt the seed with anything that should not repeat.** Payload salts with the
difficulty key so Easy and Hard deal completely different parts on the same day —
playing one never spoils the other.

Rules for keeping it deterministic:

- One `S.rng` for the run; free play swaps in `Math.random`. Never call `Math.random()`
  on a code path a daily can reach.
- Draw in a fixed order. Adding a draw earlier in the sequence reshuffles everything
  after it, which changes today's puzzle for anyone mid-run.
- **Resolution must not consume randomness at all** — only generation does. In Payload a
  drop is pure simulation, so replays of the same machine always pay the same.
- If generation logic changes materially, bump a `generatorVersion` into the hash rather
  than silently serving a different puzzle under the same day number.

## Rotating variants

The day number picks a rule twist, so consecutive days feel different without new
content:

```js
S.variant = VARIANTS[(dayNumber - 1) % VARIANTS.length];
```

A variant is a small config object folded in through the helpers (`quotaFor`,
`baseValue`, `springLimit`, `dropsForRound`) — never by branching at the call sites.
Each pairs a buff with a cost (`Heavyworks`: marbles start at 3, quotas ×1.5) so the
variants stay differently-shaped rather than easier/harder.

Always show the player what today's rules are. An unannounced rule change reads as a bug.

## Records and streaks

```js
const dailyKey = () => `payload.daily.${S.diff.key}.v1`;   // per-difficulty record
```

- **First attempt counts.** `recordDaily` returns early if a record for `dateKey`
  already exists. Replays stay allowed — they just cannot improve the recorded result,
  which keeps the one-and-done ritual intact without hiding the game.
- **Compute the streak against the record's own dateKey**, comparing to `yesterday`
  derived from it — never against "now". An attempt finished offline and synced later
  must not break the chain.
- Difficulties record separately but share one day streak: playing either keeps it alive.
- **Wrap every storage call in try/catch.** `localStorage` throws outright in some
  contexts (`data:` URLs, private mode). The run must stay playable with persistence
  quietly disabled — verify that path, it is easy to regress.
- Version the storage key (`.v1`) so a future shape change cannot crash on old data.

## Share payloads

Spoiler-free: report the *performance*, never the board or solution.

```
Payload Daily #1 ⚒️ Heavyworks · 🌤 Easy
🏆 all 4 quotas · banked 344 · best drop 60
🔥 3-day streak
```

Line 1 identifies the day, variant and difficulty so results are comparable; line 2 is
the outcome; the streak line is omitted below 2 so a first-timer's share is not sad.
Offer a copy button and fall back gracefully when the clipboard API is unavailable
(`navigator.clipboard` rejects on insecure origins) — tell the player to select the text
rather than failing silently.

Free play produces no share text at all: there is nothing to compare.
