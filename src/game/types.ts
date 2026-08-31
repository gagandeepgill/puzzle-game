/**
 * Core types for the Payload engine.
 *
 * Nothing in src/game imports a DOM or React API. The engine computes what
 * happens; the renderer decides how to show it.
 */

/* ---------- board geometry ---------- */

export const COLS = 5;
export const ROWS = 6;
export const MARBLE_CAP = 16;

/** Flat index into the board, row-major. Branded so it can't be confused
 *  with a column number, which is the easiest mistake to make here. */
export type CellIndex = number & { readonly __brand: 'CellIndex' };
export type Column = number & { readonly __brand: 'Column' };

export const cellIndex = (n: number): CellIndex => n as CellIndex;
export const column = (n: number): Column => n as Column;

export const cellAt = (row: number, col: number): CellIndex =>
  cellIndex(row * COLS + col);
export const rowOf = (i: CellIndex): number => Math.floor(i / COLS);
export const colOf = (i: CellIndex): number => i % COLS;

/* ---------- parts ---------- */

export const PART_KEYS = [
  'weight', 'anvil', 'coil', 'prism', 'spring',
  'wire', 'reso', 'fork', 'gate', 'bell',
] as const;

export type PartKey = (typeof PART_KEYS)[number];

/** What a part does to the value, used for colour-coding and loadout caps.
 *  'route' parts change where a marble goes without changing its value. */
export type PartRole = 'add' | 'multiply' | 'route';

export interface PartDef {
  readonly name: string;
  readonly glyph: string;
  readonly badge: string;
  readonly rule: string;
  readonly role: PartRole;
}

/** A board is a fixed-length array of parts or empty cells. */
export type Board = readonly (PartKey | null)[];

/* ---------- blueprints, jams, variants ---------- */

export const BLUEPRINT_KEYS = ['lead', 'overtime', 'gravity', 'screws'] as const;
export type BlueprintKey = (typeof BLUEPRINT_KEYS)[number];

export interface BlueprintDef {
  readonly name: string;
  readonly glyph: string;
  readonly rule: string;
}

/** Jams are keyed by name rather than round index, because the same jam
 *  appears at different rounds in different difficulties. */
export type JamKey = 'shortShift' | 'slippery' | 'noBells';

export interface JamDef {
  readonly key: JamKey;
  readonly text: string;
}

/** A daily rule twist. Rotates by day number. */
export interface VariantDef {
  readonly icon: string;
  readonly name: string;
  readonly desc: string;
  readonly quotaMultiplier: number;
  readonly baseBonus?: number;
  readonly springUses?: number;
  readonly drops?: number;
}

/* ---------- difficulty ---------- */

export type DifficultyKey = 'easy' | 'hard';

export interface DifficultyDef {
  readonly key: DifficultyKey;
  readonly name: string;
  readonly rounds: number;
  readonly quotas: readonly number[];
  readonly drops: number;
  /** Parts pre-installed at the start of a run, as [part, row, col]. */
  readonly start: readonly (readonly [PartKey, number, number])[];
  readonly jams: Readonly<Partial<Record<number, JamDef>>>;
  /** Round indices after which a blueprint is offered. */
  readonly blueprintAfter: readonly number[];
  readonly pools: readonly (readonly PartKey[])[];
}

/* ---------- the rules a drop resolves against ---------- */

/** Everything simulateDrop needs that isn't the board. Passing this
 *  explicitly is what keeps the simulation pure and replayable. */
export interface Rules {
  readonly baseValue: number;
  readonly springUses: number;
  readonly gravity: boolean;
  readonly jam: JamKey | null;
}

/* ---------- what a drop produces ---------- */

/** One thing that happened, in resolution order. The renderer plays these
 *  back; the breakdown UI reads them; a replay verifier re-derives them. */
export type DropEvent =
  | { readonly kind: 'enter'; readonly marble: number; readonly cell: CellIndex; readonly value: number }
  | { readonly kind: 'trigger'; readonly marble: number; readonly cell: CellIndex; readonly part: PartKey;
      readonly doubled: boolean; readonly label: string; readonly before: number; readonly after: number }
  | { readonly kind: 'skid'; readonly marble: number; readonly cell: CellIndex }
  | { readonly kind: 'split'; readonly marble: number; readonly cell: CellIndex; readonly spawned: number }
  | { readonly kind: 'bounce'; readonly marble: number; readonly cell: CellIndex; readonly toRow: number }
  | { readonly kind: 'confiscated'; readonly marble: number; readonly cell: CellIndex; readonly value: number }
  | { readonly kind: 'gravity'; readonly marble: number; readonly cell: CellIndex; readonly value: number }
  | { readonly kind: 'banked'; readonly marble: number; readonly value: number };

export interface DropResult {
  /** Total banked by every marble that reached the bottom. */
  readonly total: number;
  /** Ordered log of everything that happened. */
  readonly events: readonly DropEvent[];
  /** How many marbles existed, including bell spawns and prism copies. */
  readonly marbles: number;
}

/* ---------- run state ---------- */

/** Phase as a union, so states that can't coexist can't be represented.
 *  The old implementation carried phase/busy/submitted as parallel flags. */
export type Phase =
  | { readonly kind: 'drafting'; readonly offers: readonly PartKey[]; readonly selected: number | null }
  | { readonly kind: 'blueprint'; readonly offers: readonly BlueprintKey[] }
  | { readonly kind: 'playing' }
  | { readonly kind: 'runOver'; readonly won: boolean };

export type Mode = 'daily' | 'free';

export interface RunState {
  readonly mode: Mode;
  readonly difficulty: DifficultyDef;
  readonly variant: VariantDef | null;
  readonly board: Board;
  readonly round: number;
  readonly roundScore: number;
  readonly total: number;
  readonly bestDrop: number;
  readonly dropsLeft: number;
  readonly blueprints: ReadonlySet<BlueprintKey>;
  readonly phase: Phase;
  readonly screwUsed: boolean;
  /** A blueprint is owed after the current part draft resolves. The vanilla
   *  build runs part draft first, then blueprint; skipping the part draft on
   *  blueprint rounds costs Easy 1 of 3 drafts and Hard 3 of 7. */
  readonly pendingBlueprint: boolean;
}

/** Fails to compile if a union member is left unhandled. */
export function assertNever(x: never): never {
  throw new Error(`Unhandled case: ${JSON.stringify(x)}`);
}
