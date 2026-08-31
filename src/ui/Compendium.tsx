import { BLUEPRINTS, JAMS, PARTS, SCALER_KEYS } from '../game/content.js';
import { PART_KEYS, BLUEPRINT_KEYS } from '../game/types.js';
import type { PartRole } from '../game/types.js';
import { Icon, UIIcon } from './icons.js';
import type { IconName } from './icons.js';

/**
 * Every part, blueprint and jam in one place.
 *
 * A jam announcing "Echo Bells stay silent this round" means nothing to a
 * player who has never been offered an Echo Bell. The rules only existed on
 * the draft cards, which vanish the moment the choice is made.
 *
 * Every string here is read from src/game/content.ts. Restating them would
 * let the reference drift from what the parts actually do, which is worse
 * than having no reference at all.
 */
const ROLE_LABEL: Record<PartRole, string> = {
  add: 'adds',
  multiply: 'scales',
  route: 'routes',
};

const ROLE_STYLE: Record<PartRole, string> = {
  add: 'text-ok border-ok/40',
  multiply: 'text-brass border-brass/40',
  route: 'text-glow border-glow/40',
};

export function Compendium() {
  return (
    <div className="flex flex-col gap-3 mt-2">
      <section>
        <h3 className="text-label font-bold uppercase tracking-[.08em] text-steel mb-1.5">
          Parts
        </h3>
        <ul className="flex flex-col gap-1.5">
          {PART_KEYS.map((key) => {
            const p = PARTS[key];
            return (
              <li key={key} className="flex gap-2 items-start">
                <span className="w-[22px] shrink-0 flex justify-center pt-px">
                  <Icon name={p.glyph as IconName} size={20} />
                </span>
                <span className="flex-1">
                  <span className="font-bold text-body text-ink">{p.name}</span>
                  <span
                    className={`ml-1.5 text-micro font-bold uppercase tracking-[.06em] border rounded-full px-1.5 py-px ${ROLE_STYLE[p.role]}`}
                  >
                    {ROLE_LABEL[p.role]}
                  </span>
                  <span className="block text-meta text-steel">{p.rule}</span>
                </span>
              </li>
            );
          })}
        </ul>
        {/* The one rule that is about two parts rather than one, and the only
            reason a Tuning Fork is worth anything. */}
        <p className="text-meta text-steel mt-2">
          A <b className="text-ink">Tuning Fork</b> doubles whatever sits directly above, below,
          left or right of it. Forks never double each other, and the effect does not stack.
        </p>
        <p className="text-meta text-steel mt-1">
          Every draft offers at least one part that scales rather than adds
          ({SCALER_KEYS.map((k) => PARTS[k].name).join(', ')}), so a run can never be starved
          of multipliers.
        </p>
      </section>

      <section>
        <h3 className="text-label font-bold uppercase tracking-[.08em] text-glow mb-1.5">
          Blueprints — permanent, for the rest of the run
        </h3>
        <ul className="flex flex-col gap-1.5">
          {BLUEPRINT_KEYS.map((key) => (
            <li key={key} className="flex gap-2 items-start">
              <span className="w-[22px] shrink-0 flex justify-center pt-px text-glow">
                <Icon name={BLUEPRINTS[key].glyph as IconName} size={20} />
              </span>
              <span className="flex-1">
                <span className="font-bold text-body text-ink">{BLUEPRINTS[key].name}</span>
                <span className="block text-meta text-steel">
                  {BLUEPRINTS[key].rule}
                </span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      <section>
        <h3 className="text-label font-bold uppercase tracking-[.08em] text-bad mb-1.5">
          Jams — one round only
        </h3>
        <ul className="flex flex-col gap-1.5">
          {JAMS.map((jam) => (
            <li key={jam.key} className="flex gap-2 items-start">
              <span aria-hidden className="w-[22px] shrink-0 flex justify-center pt-px text-bad">
                <UIIcon name="alert" size={17} />
              </span>
              <span className="flex-1">
                <span className="font-bold text-body text-ink">{jam.name}</span>
                <span className="block text-meta text-steel">{jam.rule}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>

      {/* CC BY 3.0 requires attribution, and this is the surface where the
          icons are all on screen at once. */}
      <p className="text-micro text-steel/80 leading-snug border-t border-edge/40 pt-2">
        Icons by{' '}
        <a href="https://game-icons.net" className="underline decoration-dotted">
          game-icons.net
        </a>{' '}
        (Lorc, Delapouite), CC BY 3.0.
      </p>
    </div>
  );
}
