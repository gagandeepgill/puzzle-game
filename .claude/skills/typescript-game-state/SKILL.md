---
name: typescript-game-state
description: 'TypeScript conventions for modelling this game''s state — discriminated unions for phases, branded IDs, exhaustive part handling, and keeping the pure rules engine free of any renderer. Use when writing or changing types for the React/Expo rewrite, adding a part or blueprint, or designing the shared core that both the web and native builds consume.'
---

# Typing the game

Conventions for the TypeScript + React rewrite (framework decision in `docs/PLATFORM.md`, styling in ADR-001). The existing interfaces in `MASTER_PROMPT.md` are the starting point; this is how to extend them without the types drifting into decoration.

## The architectural rule the types must enforce

**The rules engine must not know a renderer exists.** Everything in `src/game/` is pure TypeScript: no `document`, no React, no React Native imports. That is what makes it testable, what makes the same code serve web and native, and what makes deterministic replay possible for future leaderboards.

Enforce it mechanically, not by discipline — an ESLint `no-restricted-imports` rule on the `src/game/**` path is worth more than a convention nobody remembers.

## Discriminated unions for phase, never booleans

The current implementation carries `phase`, `busy`, `submitted` and `draftKind` as parallel flags, which permits states that cannot exist (busy while drafting, submitted while playing). Model the phase as a union so the compiler forbids them:

```ts
type Phase =
  | { kind: 'drafting'; offers: readonly PartKey[]; selected: number | null }
  | { kind: 'placing'; part: PartKey }
  | { kind: 'dropping'; column: number }
  | { kind: 'roundOver'; cleared: boolean }
  | { kind: 'runOver'; result: RunResult };
```

Read it with a `switch` on `kind` and a `default` that fails to compile when a case is missed:

```ts
const assertNever = (x: never): never => {
  throw new Error(`Unhandled: ${JSON.stringify(x)}`);
};
```

That `assertNever` is what turns "add a phase" from a bug hunt into a compiler error list.

## Exhaustive part handling

Parts are the thing most likely to be added, so make the compiler find every place that needs updating:

```ts
const PART_KEYS = ['weight', 'anvil', 'coil', 'prism', 'spring',
                   'wire', 'reso', 'fork', 'gate', 'bell'] as const;
type PartKey = typeof PART_KEYS[number];

// Record (not Partial) — adding a PartKey breaks this until it is filled in.
const PARTS: Record<PartKey, PartDef> = { /* … */ };
```

Resolve a part's effect through a `switch` on `PartKey` with `assertNever`, never a lookup that silently no-ops on an unknown key. A part that exists in the collection but not in the resolver should be impossible, not merely unlikely.

## Brand the IDs

Cell indices, column numbers and seeds are all `number`, and passing one where another belongs is the easiest bug in this codebase to write:

```ts
type CellIndex = number & { readonly __brand: 'CellIndex' };
type Column = number & { readonly __brand: 'Column' };
const cell = (n: number) => n as CellIndex;
```

Cheap, zero runtime cost, and it catches `drop(cellIndex)` at compile time.

## `readonly` everything the engine returns

The engine should hand back values the caller cannot mutate — that is what keeps replay honest and makes React's change detection reliable:

```ts
readonly board: readonly (PartKey | null)[];
readonly path: readonly CellIndex[];
```

Use `as const` on all content tables (parts, blueprints, difficulties, variants) so their literal types survive.

## Keep the simulation a pure function

The single most valuable shape in the rewrite:

```ts
function simulateDrop(board: Board, column: Column, rules: Rules): DropResult;
```

No animation, no timers, no side effects — it returns the full ordered list of what fired and the final values. The renderer then *plays back* that result at whatever speed it likes.

This is what makes the drop breakdown (#10) nearly free, makes the skip-animation control trivial, makes replay verification possible for leaderboards, and makes the whole thing unit-testable without a browser. **If a change to the engine requires touching the renderer, the seam is in the wrong place.**

## Don't over-type the view

Branded IDs and exhaustive unions belong in the engine. React components should take plain props. Resist typing CSS class strings or building a type-level design system — ADR-001 already notes that Tailwind's safety comes from editor tooling rather than the type system, and fighting that produces ceremony without safety.

## Strict mode, and what it actually buys

`strict: true`, plus `noUncheckedIndexedAccess` — the latter matters specifically here because the board is an array indexed by computed cell positions, and it forces the `undefined` check that off-grid maths would otherwise skip silently.
