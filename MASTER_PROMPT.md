# Master Developer Prompt: Ledger Lane

**Status: proposal, not a description of this repo. Written 2026-08-31, before
any code existed, and not built.**

What it specs and what is actually here differ on every axis that matters:

| This document | The repo today |
|---|---|
| Ledger Lane as a React Native app: Expo, Zustand, TanStack Query, MMKV, Reanimated | Ledger Lane is one self-contained HTML file, `public/ledger.html`, with no build and no state library |
| A daily UTC-seeded puzzle for Ledger Lane, with streaks, a generator and a solver | Ledger Lane has no daily at all. That machinery was built for **Payload** instead, in `src/game/rng.ts` and `src/game/daily.ts` |
| Nothing about Payload | Payload is the flagship, and is React and TypeScript |

Read it as a design brief for a version of Ledger Lane that may still get built.
It is not loaded as context by anything, so nothing behaves differently because
of it. For how the repo actually works, see [`CLAUDE.md`](CLAUDE.md); for the
daily mechanics as they were really implemented, see
`.claude/skills/daily-seeded-runs`.

The rules in section 2 and the design pillars in section 1 are the parts that
have held up. The architecture from section 3 onward describes a stack this repo
never adopted.

---

> A daily 4x4 grid-rotation puzzle game for React Native. One puzzle per day, worldwide.
> Tap tiles to rotate arrows and route the day's gold shipment from the **Vault** to the
> **Market.** Any connection wins, but the best couriers bank the most gold.
>
> This document is a complete, self-contained build specification. An engineer (or agent)
> should be able to implement the production feature from this file alone.

---

## 1. Product overview

**Working title:** Ledger Lane (original IP; all theming in this document is invented for this game).

**Elevator pitch:** Wordle's daily ritual meets a rotate-to-connect routing puzzle. Every
player in the world gets the same 4x4 board each UTC day. Tapping a lane tile rotates its
arrow 90° clockwise. Any path from the Vault to the Market wins, but coin purses, pickpocket
adjacency taxes, and a per-tile courier toll make *which* route you build a real optimization.
Your score is your net gold as a percentage of the day's provable optimum, plus a
taps-vs-par efficiency substat, compressed into one spoiler-free shareable line.

**Design pillars** (each backed by research on successful daily puzzles):

1. **Scarcity + streaks.** Exactly one puzzle per UTC day. Streaks are the retention engine
   (Wordle, NYT Connections). No endless mode at v1.
2. **Guaranteed-win floor.** Any Vault→Market connection completes the daily and preserves
   the streak. Failure states that punish guessing are the genre's #1 feel-bad (Koster's
   critique of Connections); casuals must always be able to finish.
3. **Optimization ceiling.** Score-per-performance with a daily percentile outlasts binary
   win/loss for the enthusiast tier (Puzzmo model). 3-star mastery is chasing the optimal
   haul, not merely connecting.
4. **Deduction, never trial-and-error.** Every tap gives live visual feedback (the connected
   path glows from the Vault outward, and the gold counter updates). Boards are
   solver-verified so a thoughtful player can always reason their way to the optimum.
5. **Par as aspiration, not punishment.** There is no move limit and no fail state. Par
   (minimum clockwise rotations to build the optimal route) is a substat, like Flow Free's
   "perfect" star, never a wall.
6. **Share the performance trace, never the board.** The solved layout is the spoiler; the
   share payload shows only how well you did.

**Session target:** 60–180 seconds. **Platform:** iOS + Android via React Native.

---

## 2. Game rules (normative)

### 2.1 Board

- 4x4 grid, 16 tiles, row-major ids `0..15`. Row/col derived: `row = id / 4 | 0`, `col = id % 4`.
- **Vault** (start) is always a border tile (v1: fixed at id `0`, top-left). It has one fixed
  exit direction and cannot be rotated.
- **Market** (end) is always a border tile (v1: fixed at id `15`, bottom-right). It accepts
  entry from any direction and cannot be rotated.
- Every other tile is one of:

| Tile | `tileType` | Behavior | Emoji |
|---|---|---|---|
| Vault | `vault` | Path source. Fixed exit arrow. Locked. | 🏦 |
| Market | `market` | Path sink. Accepts any entry. Locked. | 🏪 |
| Lane | `lane` | Rotatable arrow tile (one exit direction). May carry a coin purse (`goldValue > 0`). | 🪙 / ⬜ |
| Pickpocket | `pickpocket` | Never traversable. Steals a flat **15g** (once per pickpocket) if **any final-path tile is orthogonally adjacent** to it. | 🥷 |
| Fountain | `fountain` | Never traversable. Pure wall, no penalty. | ⛲ |

- Some lane tiles ship **locked** (`isLocked: true`) in their correct orientation. Locked
  lanes are the difficulty dial (more locked = easier) and serve as deduction anchors.

### 2.2 Moves

- Tapping an unlocked lane rotates its arrow **90° clockwise**. That is the only move.
- Tap count increments immediately on tap (animation is cosmetic and never blocks input).
- Unlimited taps. No fail state. Over-rotating past the desired direction costs 3 extra
  taps to come around. Haste is the only enemy.

### 2.3 Path

- The **current path** is the walk starting at the Vault, repeatedly stepping in the exit
  direction of the current tile, until it (a) reaches the Market → connected, (b) leaves the
  grid, (c) enters a non-traversable tile, or (d) revisits a tile (cycle) → not connected.
- Entry side is unconstrained: a lane accepts entry from any direction; only its exit matters.
- The path is recomputed after every tap and rendered live (connected prefix glows).

### 2.4 Scoring

On **Submit** (explicit button, enabled only while the path is connected):

```
grossGold  = sum of goldValue over final-path lane tiles
courierFee = 5g x (number of final-path lane tiles)          // vault & market are free
pickpocketTax = 15g x (number of pickpockets with >= 1 final-path tile orthogonally adjacent)
netGold    = grossGold - courierFee - pickpocketTax          // may be negative; floor at 0 for display only
score%     = round(100 x netGold / optimalGold)              // optimalGold is solver-proven, > 0 by generation constraint
```

- **The first submission is the official daily result.** After submitting, the player may
  keep experimenting in a clearly-labeled "practice" state, but score, stars, streak, and
  share payload are frozen from the first bank. (Prevents score-attack grinding from
  diluting the one-and-done ritual.)
- After submission, reveal the optimal route with a replay animation ("The perfect run"),
  so a sub-100% score never feels arbitrary.

### 2.5 Stars and substat

| Stars | Condition |
|---|---|
| ⭐⭐⭐ | `netGold >= 0.95 x optimalGold` |
| ⭐⭐ | `netGold >= 0.75 x optimalGold` |
| ⭐ | Any connected submission |

- **Par substat:** `par` = minimum clockwise rotations, from the initial board, that produce
  the optimal route (solver-computed). Displayed as `taps (par N)`. Does not gate stars.
- **Perfect Day badge:** 3 stars AND `tapsUsed <= par`. Rare, braggable, cosmetic.

### 2.6 Rank titles (original flavor)

| Result | Title |
|---|---|
| Perfect Day | **Master of the Ledger** |
| ⭐⭐⭐ | **Guild Courier** |
| ⭐⭐ | **Street Runner** |
| ⭐ | **Errand Kid** |

### 2.7 Share payload

Spoiler-free performance trace (copy-to-clipboard). Never includes the board layout or route.

```
Ledger Lane #214
💰 45/45g (100%) ⛳ 6 taps (par 6)
🥷 dodged x2 · ⭐⭐⭐ · 🔥 12
ledgerlane.app
```

- `#214` = day number since epoch date. `🥷 dodged xN` = pickpockets on the board that took
  nothing. `🔥 12` = streak. Omit the streak line if streak < 2.

---

## 3. Architecture

Feature-module (micro-frontend) layout. Nothing outside `features/puzzle` may import from
its subfolders, only from `index.ts`.

```
features/puzzle/
  components/     # Board, TileCell, GoldCounter, SubmitBar, ResultSheet, ShareCard
  hooks/          # useDailyPuzzle.ts, useTileRotation.ts (Reanimated), useShare.ts
  store/          # usePuzzleStore.ts, sessionStore.ts (streak/history persistence)
  utils/          # computePath.ts, scoring.ts, rotate.ts, prng.ts, dateKey.ts
  utils/generator/# generate.ts, solve.ts, verify.ts  (pure Node-safe: NO react-native imports)
  types/          # index.ts
  index.ts        # public surface: <PuzzleScreen/>, selected hooks/selectors only
```

**Stack:** TypeScript (strict), Zustand (+ immer middleware), TanStack React Query
(+ AsyncStorage persister), NativeWind/Tailwind for styling, Reanimated for rotation
animation, AsyncStorage for session data.

**Animation rule:** the store's `rotation` is logical state; each tile's Reanimated shared
value accumulates (+90 per tap, never modulo) so the spring never spins backwards, and it
never reads back from the store.

---

## 4. TypeScript models (strict mode)

```ts
// features/puzzle/types/index.ts

export type Direction = 'N' | 'E' | 'S' | 'W';
export type Rotation = 0 | 90 | 180 | 270;
export type TileType = 'vault' | 'market' | 'lane' | 'pickpocket' | 'fountain';

export interface Tile {
  readonly id: number;                 // 0..15, row-major
  readonly tileType: TileType;
  /** Exit direction at rotation 0. null for market/pickpocket/fountain. */
  readonly baseDirection: Direction | null;
  /** Current rotation applied to baseDirection. Mutable via rotate(). */
  currentRotation: Rotation;
  /** Rotation that puts this tile on the optimal route (solver output; used by the
   *  post-submit "perfect run" reveal, never by gameplay logic). */
  readonly targetRotation: Rotation;
  readonly goldValue: number;          // coin purse on lanes; 0 otherwise
  readonly isLocked: boolean;          // vault/market/walls always true; some lanes true
}

export interface BoardState {
  readonly grid: readonly Tile[];      // length 16
  moveCount: number;                   // taps this attempt
  /** Ordered tile ids of the current walk from the vault (connected prefix). */
  path: readonly number[];
  isConnected: boolean;                // path currently reaches the market
  status: 'playing' | 'submitted';
  /** Live projection of what Submit would bank right now (null when not connected). */
  projectedNetGold: number | null;
}

export interface DailyPuzzle {
  readonly puzzleId: string;           // `ll-${dateKey}`
  readonly dateKey: string;            // 'YYYY-MM-DD' in UTC, the sole identity
  readonly dayNumber: number;          // days since epoch date, for "#214"
  readonly seed: number;               // mulberry32 seed derived from dateKey
  readonly generatorVersion: number;   // bump on any generation-logic change
  readonly initialGrid: readonly Tile[];
  readonly optimalGold: number;        // solver-proven maximum netGold, > 0
  readonly par: number;                // min CW rotations to build the optimal route
  /** Optimal route as ordered tile ids (vault..market). Drives the reveal replay. */
  readonly solutionPath: readonly number[];
}

export interface DailyResult {
  readonly netGold: number;
  readonly scorePercent: number;       // 0..100
  readonly stars: 1 | 2 | 3;
  readonly perfectDay: boolean;
  readonly tapsUsed: number;
  readonly completedAtIso: string;
}

export interface UserSession {
  streak: number;
  bestStreak: number;
  lastCompletedDateKey: string | null;
  /** Source of truth. Streak must always be recomputable from this map (self-healing). */
  history: Readonly<Record<string, DailyResult>>;   // key: dateKey
  highScores: {
    bestScorePercent: number;
    perfectDays: number;
    totalStars: number;
  };
}
```

---

## 5. Pure utilities

```ts
// features/puzzle/utils/rotate.ts
import type { Direction, Rotation } from '../types';

const CW: readonly Direction[] = ['N', 'E', 'S', 'W'];

export function effectiveDirection(base: Direction, rotation: Rotation): Direction {
  return CW[(CW.indexOf(base) + rotation / 90) % 4]!;
}

export function nextRotation(r: Rotation): Rotation {
  return ((r + 90) % 360) as Rotation;
}

/** Min clockwise taps to get from rotation a to rotation b. */
export function cwDistance(a: Rotation, b: Rotation): number {
  return (((b - a) / 90) + 4) % 4;
}
```

```ts
// features/puzzle/utils/computePath.ts
import type { Direction, Tile } from '../types';
import { effectiveDirection } from './rotate';

const STEP: Record<Direction, readonly [number, number]> = {
  N: [-1, 0], E: [0, 1], S: [1, 0], W: [0, -1],
};

export interface PathResult {
  readonly path: readonly number[];
  readonly isConnected: boolean;
}

/** Deterministic walk from the vault. Pure; shared by UI, scoring, and the solver. */
export function computePath(grid: readonly Tile[]): PathResult {
  const vault = grid.find((t) => t.tileType === 'vault');
  if (!vault?.baseDirection) return { path: [], isConnected: false };

  const path: number[] = [vault.id];
  const visited = new Set<number>([vault.id]);
  let current = vault;

  for (;;) {
    const dir = effectiveDirection(current.baseDirection!, current.currentRotation);
    const [dr, dc] = STEP[dir];
    const row = (current.id / 4 | 0) + dr;
    const col = (current.id % 4) + dc;
    if (row < 0 || row > 3 || col < 0 || col > 3) return { path, isConnected: false };

    const next = grid[row * 4 + col]!;
    if (next.tileType === 'market') {
      return { path: [...path, next.id], isConnected: true };
    }
    if (next.tileType !== 'lane' && next.tileType !== 'vault') {
      return { path, isConnected: false };               // wall or pickpocket
    }
    if (visited.has(next.id)) return { path, isConnected: false };  // cycle
    visited.add(next.id);
    path.push(next.id);
    current = next;
  }
}
```

```ts
// features/puzzle/utils/scoring.ts
import type { Tile } from '../types';

export const COURIER_FEE_PER_LANE = 5;
export const PICKPOCKET_TAX = 15;

const ORTHO: readonly (readonly [number, number])[] = [[-1, 0], [1, 0], [0, -1], [0, 1]];

export function scorePath(grid: readonly Tile[], path: readonly number[]): number {
  const onPath = new Set(path);
  const laneTiles = path.filter((id) => grid[id]!.tileType === 'lane');

  const gross = laneTiles.reduce((sum, id) => sum + grid[id]!.goldValue, 0);
  const fee = laneTiles.length * COURIER_FEE_PER_LANE;

  const tax = grid
    .filter((t) => t.tileType === 'pickpocket')
    .filter((p) =>
      ORTHO.some(([dr, dc]) => {
        const row = (p.id / 4 | 0) + dr;
        const col = (p.id % 4) + dc;
        return row >= 0 && row <= 3 && col >= 0 && col <= 3 && onPath.has(row * 4 + col);
      }),
    ).length * PICKPOCKET_TAX;

  return gross - fee - tax;
}

export function starsFor(netGold: number, optimalGold: number): 1 | 2 | 3 {
  if (netGold >= 0.95 * optimalGold) return 3;
  if (netGold >= 0.75 * optimalGold) return 2;
  return 1;
}
```

```ts
// features/puzzle/utils/prng.ts
/** mulberry32: a deterministic PRNG, so every client generates identical dailies. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashDateKey(dateKey: string, generatorVersion: number): number {
  let h = 2166136261 ^ generatorVersion;
  for (let i = 0; i < dateKey.length; i++) {
    h = Math.imul(h ^ dateKey.charCodeAt(i), 16777619);
  }
  return h >>> 0;
}
```

```ts
// features/puzzle/utils/dateKey.ts
export const EPOCH_DATE_KEY = '2026-09-01';   // day #1

export function getUtcDateKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);      // UTC only. Never getDate()
}

export function dayNumberFor(dateKey: string): number {
  const ms = Date.parse(`${dateKey}T00:00:00Z`) - Date.parse(`${EPOCH_DATE_KEY}T00:00:00Z`);
  return Math.round(ms / 86_400_000) + 1;
}

export function yesterdayKey(dateKey: string): string {
  return new Date(Date.parse(`${dateKey}T00:00:00Z`) - 86_400_000).toISOString().slice(0, 10);
}
```

---

## 6. Zustand store

```ts
// features/puzzle/store/usePuzzleStore.ts
import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { BoardState, DailyPuzzle, DailyResult, Tile } from '../types';
import { computePath } from '../utils/computePath';
import { scorePath, starsFor } from '../utils/scoring';
import { nextRotation } from '../utils/rotate';

interface PuzzleStore extends BoardState {
  puzzle: DailyPuzzle | null;
  result: DailyResult | null;

  loadPuzzle: (p: DailyPuzzle) => void;
  rotate: (tileId: number) => void;
  submit: () => DailyResult | null;
  resetAttempt: () => void;            // pre-submit only; post-submit board is practice
}

function refreshDerived(s: { grid: readonly Tile[] } & Pick<BoardState, 'path' | 'isConnected' | 'projectedNetGold'>): void {
  const { path, isConnected } = computePath(s.grid);
  s.path = path;
  s.isConnected = isConnected;
  s.projectedNetGold = isConnected ? scorePath(s.grid, path) : null;
}

export const usePuzzleStore = create<PuzzleStore>()(
  immer((set, get) => ({
    puzzle: null,
    result: null,
    grid: [],
    moveCount: 0,
    path: [],
    isConnected: false,
    status: 'playing',
    projectedNetGold: null,

    loadPuzzle: (p) =>
      set((s) => {
        s.puzzle = p;
        s.grid = p.initialGrid.map((t) => ({ ...t }));
        s.moveCount = 0;
        s.status = 'playing';
        s.result = null;
        refreshDerived(s);
      }),

    rotate: (tileId) =>
      set((s) => {
        const tile = s.grid[tileId];
        if (!tile || tile.isLocked || tile.tileType !== 'lane') return;
        tile.currentRotation = nextRotation(tile.currentRotation);
        if (s.status === 'playing') s.moveCount += 1;   // practice taps don't count
        refreshDerived(s);
      }),

    submit: () => {
      const s = get();
      if (s.status !== 'playing' || !s.isConnected || !s.puzzle) return null;
      const netGold = Math.max(0, scorePath(s.grid, s.path));
      const stars = starsFor(netGold, s.puzzle.optimalGold);
      const result: DailyResult = {
        netGold,
        scorePercent: Math.round((100 * netGold) / s.puzzle.optimalGold),
        stars,
        perfectDay: stars === 3 && s.moveCount <= s.puzzle.par,
        tapsUsed: s.moveCount,
        completedAtIso: new Date().toISOString(),
      };
      set((st) => {
        st.status = 'submitted';
        st.result = result;
      });
      return result;                    // caller persists via sessionStore.recordResult()
    },

    resetAttempt: () =>
      set((s) => {
        if (s.status !== 'playing' || !s.puzzle) return;
        s.grid = s.puzzle.initialGrid.map((t) => ({ ...t }));
        s.moveCount = 0;                // reset restores taps too, it is a fresh attempt
        refreshDerived(s);
      }),
  })),
);

// Component subscription rule: select narrowly, e.g.
//   const tile = usePuzzleStore((s) => s.grid[id]);
// so one rotation never re-renders all 16 tiles.
```

### Session store (streak + history)

```ts
// features/puzzle/store/sessionStore.ts  (Zustand + persist(AsyncStorage))
// Key rules, implement exactly:
// 1. history (Record<dateKey, DailyResult>) is the source of truth; streak is DERIVED.
// 2. On recordResult(dateKey, result):
//      streak = history[yesterdayKey(dateKey)] ? streak + 1 : 1
//    computed against the RESULT's dateKey, never against "now". An offline completion
//    synced late must not break the chain.
// 3. recomputeStreakFromHistory() runs on hydrate, self-healing after corrupt writes.
// 4. Persist under its own AsyncStorage key namespace ('ll/session'), disjoint from the
//    React Query persister ('ll/query').
```

---

## 7. Daily puzzle delivery: `useDailyPuzzle`

**Decision: deterministic client-side generation, no backend.** Same UTC `dateKey` →
same seed → identical puzzle on every device, fully offline, zero infra. The `queryFn` is
the seam: if curated puzzles are ever wanted, fetch a signed manifest there and fall back
to generation, which is a non-breaking upgrade.

```ts
// features/puzzle/hooks/useDailyPuzzle.ts
import { useQuery } from '@tanstack/react-query';
import { generateDailyPuzzle } from '../utils/generator/generate';
import { getUtcDateKey } from '../utils/dateKey';

export const GENERATOR_VERSION = 1;

export function useDailyPuzzle(dateKey: string = getUtcDateKey()) {
  return useQuery({
    queryKey: ['dailyPuzzle', GENERATOR_VERSION, dateKey],
    queryFn: () => generateDailyPuzzle(dateKey, GENERATOR_VERSION), // sync & pure; wrap in Promise.resolve
    staleTime: Infinity,
    gcTime: Infinity,                   // a daily never changes
  });
}
```

- **Offline-first:** `PersistQueryClientProvider` + `@tanstack/query-async-storage-persister`
  over AsyncStorage, `maxAge: Infinity` for this key family.
- **Rollover:** subscribe to `AppState` + a timer for UTC midnight. On a new `dateKey`,
  do NOT yank the live board. Show a "New puzzle available" prompt. Display a countdown
  to the next puzzle in the result sheet.
- **Versioning:** `generatorVersion` is part of the seed hash and the query key. Never
  change generation logic without bumping it.

---

## 8. Generator & solver (`utils/generator/`, Node-safe)

An unsolvable or degenerate daily is a same-day global incident. Generation is
constraint-checked and solver-verified:

1. **Generate** from `mulberry32(hashDateKey(dateKey, version))`: place vault (id 0, exit E
   or S), market (id 15), 1–2 walls (`fountain`), 1–2 `pickpocket`s, 2–3 coin lanes
   (gold 10–50 in steps of 5), remaining tiles as lanes with random initial rotations;
   lock 2–5 lanes in correct orientation (weekday difficulty dial: more locked Mon/Tue,
   fewer Fri/Sat).
2. **Solve** (`solve.ts`): enumerate all simple vault→market routes (DFS over the 4x4,
   trivially small), score each with `scorePath`, take the max ⇒ `optimalGold`,
   `solutionPath`; `par` = Σ `cwDistance(initialRotation, requiredRotation)` over unlocked
   lanes on the optimal route.
3. **Quality gate** (`verify.ts`). Reject and re-roll (bump a retry counter into the seed)
   unless ALL hold:
   - at least one connected route exists; `optimalGold > 0`
   - at least 2 distinct connected routes with different scores (a real choice)
   - the optimal route is unique (no score tie at the top)
   - `4 <= par <= 12`
   - optimal route length ≥ 6 tiles; the naive shortest route is NOT the optimal one on
     at least Wed–Sun boards (the "greedy path is a trap" hook)
   - every coin tile is reachable by some connected route (nothing looks broken)
   - retry cap 50; if exhausted, fall back to the nearest previous passing seed (defined,
     deterministic fallback, never throwing at runtime).
4. **CI gate (mandatory):** a script (`npm run verify:calendar`) generates and verifies the
   next 365 dateKeys. It runs on every PR touching `utils/generator/` or `utils/*.ts` and
   fails the build on any rejection-cap hit or gate violation. This is the guarantee that
   an unsolvable daily can never ship.

---

## 9. Puzzle JSON schema + 3 sample dailies

Wire/storage schema (also the fixture format for tests):

```json
{
  "$schema": "ledger-lane/daily-puzzle.v1",
  "puzzleId": "ll-2026-09-01",
  "dateKey": "2026-09-01",
  "dayNumber": 1,
  "seed": 84921,
  "generatorVersion": 1,
  "optimalGold": 20,
  "par": 5,
  "solutionPath": [0, 1, 2, 3, 7, 11, 15],
  "grid": [
    { "id": 0, "tileType": "vault", "baseDirection": "E", "currentRotation": 0, "targetRotation": 0, "goldValue": 0, "isLocked": true }
  ]
}
```

> The three boards below are hand-authored illustrations of the format and difficulty
> band. The generator + solver remain the source of truth: CI must re-verify these
> fixtures with `solve.ts`, and solver output overrides any hand-computed number here.

### Sample 1: `ll-2026-09-01` "Opening Day" (easy Monday)

Layout (row-major; V=vault, M=market, F=fountain wall, P=pickpocket, numbers=coin gold):

```
V   .   20  .
.   .   P   40
.   F   .   .
.   30  .   M
```

- Vault exit E. Fountain at 9, pickpocket at 6. Coins: 20g @ 2, 40g @ 7, 30g @ 13.
- **Optimal:** `0→1→2→3→7→11→15`. Gross 60, fee 25 for 5 lanes, pickpocket 6 is adjacent to
  path tiles 2 and 7 ⇒ tax 15. **Net 20. Par 5** (initial rotations one CW turn off on
  1, 2, 3, 7, 11).
- **Decoy:** `0→4→8→12→13→14→15`. Gross 30, fee 25, no tax ⇒ net 5. Connects (1★ floor)
  but teaches that the pickpocket tax can still be worth eating.

### Sample 2: `ll-2026-09-02` "The Long Way Round" (medium)

```
V   .   .   P
10  .   F   .
.   50  .   25
P   .   .   M
```

- Vault exit S. Fountain at 6. Pickpockets at 3 and 12. Coins: 10g @ 4, 50g @ 9, 25g @ 11.
- **Optimal:** `0→4→5→9→10→11→15`. Gross 85, fee 25, no pickpocket adjacency ⇒ **net 60.
  Par 5.** Locked anchor: lane 14 locked pointing E (decoy bait).
- **Decoy:** `0→4→8→9→10→11→15`. Same gross 85, fee 25, but tile 8 is adjacent to
  pickpocket 12 ⇒ tax 15, net 45. The lesson: two routes with identical coins differ only
  by adjacency. Deduce, don't guess.

### Sample 3: `ll-2026-09-03` "Rush Hour" (hard)

```
V   .   .   20
.   F   30  40
P   .   F   .
.   .   .   M
```

- Vault exit E. Fountains at 5 and 10 (diagonal double wall). Pickpocket at 8.
  Coins: 20g @ 3, 30g @ 6, 40g @ 7.
- **Optimal:** `0→1→2→6→7→11→15`. Gross 70, fee 25, no tax ⇒ **net 45. Par 6.**
  Locked bait: lane 4 locked pointing S, a dead branch into the pickpocket row that
  punishes tapping before reading the board.
- **Decoy:** `0→1→2→3→7→11→15`. Gross 60, fee 25 ⇒ net 35, a clean 2★.

---

## 10. UX requirements

- **Live feedback:** connected path prefix glows gold from the Vault; gold counter and
  projected net update on every tap. This is the Wordle-green-square drip, and it is non-negotiable.
- **Submit bar:** disabled until connected; shows projected net ("Bank 45g?"). Submitting
  triggers coin fly-to-counter animation, then the result sheet: score %, stars, title,
  taps vs par, optimal-route reveal replay, countdown to next daily, Share button.
- **Rotation animation:** Reanimated `withTiming` +90° per tap on an accumulating shared
  value; input never blocked by animation; haptic tick per rotation.
- **Locked tiles:** visually distinct frame + lock glyph; tapping one gives a small shake
  + haptic buzz, no rotation.
- **Accessibility:** every tile has an accessibility label ("Lane, pointing east, 20 gold");
  reduced-motion setting swaps animations for instant state changes; color-blind-safe path
  highlight (glow + outline, never color alone).
- **First-run:** 15-second inline tutorial on a fixed 3-tap practice board (not the daily).

---

## 11. Acceptance criteria & test plan

**Unit (Vitest/Jest, pure utils, target 100% on `utils/`):**
- `computePath`: connected, off-grid, wall hit, pickpocket hit, cycle, market entry from
  each direction, vault-adjacent market.
- `scorePath`: fee math, multi-pickpocket adjacency (taxed once each), pickpocket adjacent
  to two path tiles (taxed once), negative net.
- `rotate`/`cwDistance`: full rotation table.
- `starsFor` boundaries: exactly 95%, 94.9%, exactly 75%.
- `dateKey`: UTC boundary (23:59:59Z vs 00:00:00Z), `dayNumberFor` epoch, `yesterdayKey`
  across month/year boundaries.
- PRNG determinism: same seed ⇒ identical sequence; `hashDateKey` version sensitivity.
- Generator: the three fixtures re-verified by `solve.ts`; quality-gate rejection cases.

**Store tests:** rotate on locked/wall tiles is a no-op; move counting; submit freezes the
result (second submit returns null); practice taps after submit don't change `moveCount`;
reset restores initial grid and zeroes taps.

**Streak tests:** consecutive days increment; gap resets to 1; offline completion recorded
against its own dateKey; recompute-from-history heals a corrupted streak counter.

**Integration:** `useDailyPuzzle` returns identical puzzles for the same dateKey across
remounts and (mocked) devices; query persists across app restart (AsyncStorage persister);
rollover prompt appears on dateKey change without destroying the in-progress board.

**CI:** `verify:calendar` (365 days) green; TypeScript `--strict` clean; lint clean.

**Definition of done:** all of the above green, plus a manual pass of the 90-second loop on
one iOS and one Android device: open → solve → submit → reveal → share payload lands on the
clipboard exactly as specified in §2.7.

---

## 12. Known risks (mitigations built into this spec)

1. **Unsolvable/degenerate daily** → solver quality gate + 365-day CI pre-verification +
   deterministic fallback seed (§8).
2. **UTC rollover / clock skew** → dateKey-as-identity, AppState rollover prompt, streak
   computed against the result's own dateKey (§7, §6). Device-clock streak cheating is
   accepted for v1 (no server); revisit only if leaderboards ship.
3. **Score-grinding diluting the daily ritual** → first submission is official; post-submit
   board is explicitly "practice" (§2.4).
4. **"How was that score possible?!" frustration** → mandatory optimal-route reveal replay
   after submission (§2.4).
5. **Multi-device sync** → out of scope for v1; `history` keyed by dateKey is a
   union-mergeable map, so a future account system merges without conflicts (§6).

---

## 13. Out of scope for v1 (explicitly)

Endless/practice puzzle archive, leaderboards, accounts/sync, alternate mechanics
(karma-balance mode is the designed "hard mode" candidate for a later weekly slot),
tablet layouts, widgets, notifications.
