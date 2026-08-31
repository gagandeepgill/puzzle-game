/**
 * Content tables. Ported verbatim from public/payload.html so the engine scores
 * identically to the shipped build — the tests depend on that.
 */
import type {
  BlueprintDef, BlueprintKey, DifficultyDef, DifficultyKey,
  JamDef, PartDef, PartKey, VariantDef,
} from './types.js';

export const PARTS: Record<PartKey, PartDef> = {
  weight: { name: 'Weight', glyph: 'weight', badge: '+3', role: 'add',
    rule: 'Marble value +3.' },
  anvil: { name: 'Anvil', glyph: 'anvil', badge: '+8 ⬅', role: 'add',
    rule: '+8, but knocks the marble one column left.' },
  coil: { name: 'Coil', glyph: 'coil', badge: '×2', role: 'multiply',
    rule: 'Marble value ×2.' },
  prism: { name: 'Prism', glyph: 'prism', badge: 'SPLIT', role: 'route',
    rule: 'Splits the marble — a full copy drops into the next column.' },
  spring: { name: 'Spring', glyph: 'spring', badge: '↑2', role: 'route',
    rule: 'Bounces the marble 2 cells up, re-triggering parts. Once per marble.' },
  wire: { name: 'Copper Wire', glyph: 'wire', badge: '+touch', role: 'add',
    rule: '+1 for every part this marble has already touched.' },
  reso: { name: 'Resonator', glyph: 'reso', badge: '×1.5', role: 'multiply',
    rule: '×1.5 — or ×3 if the marble already touched another Resonator.' },
  fork: { name: 'Tuning Fork', glyph: 'fork', badge: '2× adj', role: 'multiply',
    rule: 'Does nothing itself — DOUBLES the effect of the 4 adjacent parts.' },
  gate: { name: 'Gilded Gate', glyph: 'gate', badge: '≥10:×3', role: 'multiply',
    rule: 'Value ≥ 10 → ×3. Below 10, the marble is confiscated.' },
  bell: { name: 'Echo Bell', glyph: 'bell', badge: '+marble', role: 'route',
    rule: 'Every drop also releases a bonus marble down this column.' },
};

/** Parts that scale rather than merely add. Every draft is forced to contain
 *  at least one, so a run can never be starved of multipliers. */
export const SCALER_KEYS: readonly PartKey[] =
  ['coil', 'prism', 'reso', 'fork', 'spring', 'bell'];

export const BLUEPRINTS: Record<BlueprintKey, BlueprintDef> = {
  lead: { name: 'Lead Marbles', glyph: 'lead',
    rule: 'All marbles start at value 2 instead of 1.' },
  overtime: { name: 'Overtime', glyph: 'overtime',
    rule: '+1 drop every round, for the rest of the run.' },
  gravity: { name: 'Gravity Well', glyph: 'gravity',
    rule: 'Marbles gain +1 for every row they fall.' },
  screws: { name: 'Loose Screws', glyph: 'screws',
    rule: 'Once per round, relocate one installed part.' },
};

/** Daily rule twists, rotating by day number. Each pairs a buff with a cost
 *  so the variants are differently shaped rather than easier or harder. */
export const VARIANTS: readonly VariantDef[] = [
  { icon: 'heavyworks', name: 'Heavyworks', quotaMultiplier: 1.5, baseBonus: 2,
    desc: 'Marbles start at value 3 — but quotas are half again as steep.' },
  { icon: 'perpetual', name: 'Perpetual Motion', quotaMultiplier: 1.2, springUses: 2,
    desc: 'Every Spring fires TWICE per marble. Quotas up 20%.' },
  { icon: 'tightpurse', name: 'Tight Purse', quotaMultiplier: 0.65, drops: 2,
    desc: 'Only 2 drops per round — quotas eased to match. Every drop must count.' },
];

/**
 * Easy and Hard deliberately share no round. They differ in length, drops,
 * starting machine, pools, jams, blueprint cadence, and daily seed salt.
 * "Easy is Hard truncated" was explicitly rejected.
 */
export const DIFFICULTIES: Record<DifficultyKey, DifficultyDef> = {
  easy: {
    key: 'easy', name: 'Short Shift', rounds: 4,
    quotas: [12, 30, 68, 145],
    drops: 4,
    start: [['weight', 2, 2], ['weight', 4, 2], ['coil', 5, 2]],
    jams: { 2: { key: 'noBells', name: 'Power Cut',
      rule: 'Echo Bells stay silent this round.' } },
    blueprintAfter: [1],
    pools: [
      ['coil', 'weight', 'wire', 'prism'],
      ['prism', 'coil', 'reso', 'weight', 'spring'],
      ['fork', 'prism', 'coil', 'bell', 'reso'],
      ['fork', 'reso', 'gate', 'prism', 'bell', 'spring'],
    ],
  },
  hard: {
    key: 'hard', name: 'Long Haul', rounds: 8,
    quotas: [10, 22, 48, 95, 190, 340, 600, 1000],
    drops: 3,
    start: [['weight', 2, 2], ['weight', 4, 2]],
    jams: {
      2: { key: 'shortShift', name: 'Short Shift',
        rule: 'The foreman allows only 2 drops this round.' },
      5: { key: 'slippery', name: 'Slippery Marbles',
        rule: 'Each marble skids past the FIRST part it touches.' },
    },
    blueprintAfter: [1, 3, 5],
    pools: [
      ['weight', 'coil', 'wire', 'weight'],
      ['coil', 'prism', 'weight', 'anvil', 'wire'],
      ['prism', 'spring', 'reso', 'coil', 'gate'],
      ['fork', 'prism', 'coil', 'bell', 'reso'],
      ['fork', 'bell', 'reso', 'gate', 'spring', 'prism'],
      ['fork', 'prism', 'coil', 'spring', 'bell'],
      ['fork', 'reso', 'gate', 'prism', 'bell', 'spring'],
      ['fork', 'prism', 'reso', 'coil', 'gate', 'bell'],
    ],
  },
};

/**
 * Every jam in the game, deduped across difficulties.
 *
 * Derived rather than hand-listed: jams are declared per round inside
 * DIFFICULTIES, and a second list would be free to drift from the one the
 * rules actually read.
 */
export const JAMS: readonly JamDef[] = (() => {
  const seen = new Map<string, JamDef>();
  for (const d of Object.values(DIFFICULTIES)) {
    for (const jam of Object.values(d.jams)) {
      if (jam && !seen.has(jam.key)) seen.set(jam.key, jam);
    }
  }
  return [...seen.values()];
})();
