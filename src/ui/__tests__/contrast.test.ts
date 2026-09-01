/**
 * Every text colour must clear its contrast floor on every surface it can
 * land on.
 *
 * This exists because the comment in `tailwind.config.js` was wrong twice.
 * It claimed `card` was the tightest background in the app, which stopped
 * being true the day `bg-machined` shipped on board cells: on that gradient's
 * lit top stop, `edge` measured 2.86:1 against the 3.0 WCAG 1.4.11 wants of a
 * component boundary, and a `steel` part badge measured 4.23:1 against the
 * 4.5 body text wants. Both shipped, both were caught only because someone
 * re-measured by hand months later.
 *
 * A comment cannot fail a build. So the values are read out of the config
 * rather than restated here — adding a colour adds a case, and lightening a
 * surface fails here instead of in production.
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import config from '../../../tailwind.config.js';

type Hex = `#${string}`;

const colors = config.theme?.extend?.colors as Record<string, string>;
const backgroundImage = config.theme?.extend?.backgroundImage as Record<string, string>;

/** Relative luminance, WCAG 2.x §Relative luminance. */
function luminance(hex: Hex): number {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  const [r, g, b] = linear as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Contrast ratio, WCAG 2.x §Contrast ratio. Order-independent. */
export function contrast(a: Hex, b: Hex): number {
  const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * The lit top stop of a gradient, which is the worst case for anything drawn
 * on it. A surface lit from the top-left is lightest at 0%, so text sitting
 * anywhere on it has at least this much contrast and usually more.
 */
function topStop(gradient: string): Hex | null {
  const match = /#[0-9a-fA-F]{6}/.exec(gradient);
  return match ? (match[0].toLowerCase() as Hex) : null;
}

/**
 * Every surface the app paints text or a border on. The flat darks, plus the
 * lit edge of every gradient in the theme — that second half is what the old
 * comment missed.
 *
 * `machined-brass` is excluded: it is a brass button face, and the only thing
 * drawn on it is `#241a05`, which is checked separately below because it is a
 * one-off literal rather than a token.
 */
const SURFACES: ReadonlyArray<readonly [string, Hex]> = [
  ['ground', colors.ground as Hex],
  ['panel', colors.panel as Hex],
  ['card', colors.card as Hex],
  ...Object.entries(backgroundImage)
    .filter(([name]) => name !== 'machined-brass')
    .map(([name, gradient]) => {
      const stop = topStop(gradient);
      if (!stop) throw new Error(`no hex stop in backgroundImage.${name}`);
      return [`${name} (lit stop)`, stop] as const;
    }),
];

/**
 * `edge` is a component boundary, which WCAG 1.4.11 puts at 3.0. Everything
 * else here is drawn as text somewhere and takes the 4.5 of 1.4.3.
 *
 * `copper` only appears as a gradient stop in the quota bar today. It is held
 * to the text floor anyway, so that using it as text later is not a silent
 * regression.
 */
const FLOOR: Record<string, number> = { edge: 3 };
const TEXT_FLOOR = 4.5;

const FOREGROUNDS = Object.entries(colors)
  .filter(([name]) => !['ground', 'panel', 'card'].includes(name));

describe('contrast floors', () => {
  it('has surfaces to check, including the gradients', () => {
    // Guards the parsing above: if the config is restructured and SURFACES
    // silently empties, every assertion below would pass vacuously.
    expect(SURFACES.length).toBeGreaterThanOrEqual(6);
    expect(SURFACES.map(([n]) => n)).toContain('machined (lit stop)');
    expect(FOREGROUNDS.length).toBeGreaterThanOrEqual(7);
  });

  for (const [fgName, fg] of FOREGROUNDS) {
    const floor = FLOOR[fgName] ?? TEXT_FLOOR;
    it(`${fgName} clears ${floor}:1 on every surface`, () => {
      for (const [bgName, bg] of SURFACES) {
        const ratio = contrast(fg as Hex, bg);
        expect(
          Number(ratio.toFixed(2)),
          `${fgName} on ${bgName} is ${ratio.toFixed(2)}:1, under the ${floor}:1 floor. `
          + 'Lighten the token or darken the surface, then update the table in '
          + 'tailwind.config.js with the measured number.',
        ).toBeGreaterThanOrEqual(floor);
      }
    });
  }

  it('the brass button face carries its label', () => {
    // The one hardcoded foreground in the app: `text-[#241a05]` on the Play
    // again and dismissed-modal buttons.
    const brassFace = topStop(backgroundImage['machined-brass'] as string);
    expect(brassFace).not.toBeNull();
    expect(contrast('#241a05', brassFace as Hex)).toBeGreaterThanOrEqual(TEXT_FLOOR);
  });

  it('records the worst case for each foreground', () => {
    // Not an assertion so much as the table the config comment quotes. If this
    // output and that comment disagree, the comment is the one that is wrong.
    const worst = FOREGROUNDS.map(([name, hex]) => {
      const [ratio, where] = SURFACES.reduce<[number, string]>(
        (acc, [bgName, bg]) => {
          const r = contrast(hex as Hex, bg);
          return r < acc[0] ? [r, bgName] : acc;
        },
        [Infinity, ''],
      );
      return { name, ratio: Number(ratio.toFixed(2)), on: where };
    });
    // Every worst case sits on the same surface, which is the point: one
    // background is the binding constraint and the config should name it.
    const surfaces = new Set(worst.map((w) => w.on));
    expect(surfaces.size, `worst cases are spread across ${[...surfaces].join(', ')}`).toBe(1);
  });
});

/**
 * The pixel skin's palette.
 *
 * Lives in CSS custom properties rather than the Tailwind theme, so the suite
 * above cannot see it. Read out of `pixel.css` and held to the same floors.
 *
 * Three of the supplied tokens did not clear them and were lifted: purple was
 * 3.91:1, danger 4.26:1, and edge 1.40:1 against the 3.0 that WCAG 1.4.11
 * wants of a component boundary. Edge is the border on every panel and every
 * board cell, and cells are buttons.
 */
describe('pixel palette floors', () => {
  const css = readFileSync(new URL('../pixel/pixel.css', import.meta.url), 'utf8');
  // indexOf plus a regex literal, rather than a RegExp built from a template.
  // An escaped `\s` inside a template literal is just `s`, which made the
  // first version of this match nothing and fail on the first token.
  const token = (name: string): Hex => {
    const at = css.indexOf(`--px-${name}:`);
    if (at < 0) throw new Error(`--px-${name} not declared in pixel.css`);
    const m = /#[0-9a-fA-F]{6}/.exec(css.slice(at, at + 80));
    if (!m) throw new Error(`--px-${name} has no hex value`);
    return m[0].toLowerCase() as Hex;
  };

  // Every background the skin paints text or a border on.
  const surfaces = (['bg', 'panel', 'cell'] as const).map((n) => [n, token(n)] as const);

  const text = ['text', 'blue', 'purple', 'green', 'orange', 'gold', 'danger'] as const;

  for (const name of text) {
    it(`--px-${name} clears 4.5:1 on every pixel surface`, () => {
      for (const [bgName, bg] of surfaces) {
        const ratio = contrast(token(name), bg);
        expect(
          Number(ratio.toFixed(2)),
          `--px-${name} on --px-${bgName} is ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    });
  }

  it('--px-edge clears 3:1, because it is what identifies a board cell', () => {
    for (const [bgName, bg] of surfaces) {
      const ratio = contrast(token('edge'), bg);
      expect(
        Number(ratio.toFixed(2)),
        `--px-edge on --px-${bgName} is ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps the supplied value recorded next to each correction', () => {
    // The original hex stays in a comment so the design intent is still
    // readable and the change is auditable rather than silent.
    for (const original of ['#a449e6', '#d94b56', '#263544']) {
      expect(css, original).toContain(original);
    }
  });
});

/**
 * The game skin's palette.
 *
 * Same treatment as the pixel one above: custom properties the Tailwind suite
 * cannot see, read out of `game.css` and held to the same floors.
 *
 * The mockup sheet's own token table, transcribed. Ten of its eleven values
 * cleared as supplied; `border` measured 1.29:1 against `panel` and was
 * lifted, which matters more here than anywhere else because it is the
 * outline of every panel and every board cell, and cells are buttons.
 */
describe('game palette floors', () => {
  const css = readFileSync(new URL('../pixel/game.css', import.meta.url), 'utf8');
  const token = (name: string): Hex => {
    const at = css.indexOf(`--gm-${name}:`);
    if (at < 0) throw new Error(`--gm-${name} not declared in game.css`);
    const m = /#[0-9a-fA-F]{6}/.exec(css.slice(at, at + 80));
    if (!m) throw new Error(`--gm-${name} has no hex value`);
    return m[0].toLowerCase() as Hex;
  };

  // panel-alt is the lightest of the three and therefore the binding one, but
  // all three are checked so that darkening one later cannot go unnoticed.
  const surfaces = (['bg', 'panel', 'panel-alt'] as const).map((n) => [n, token(n)] as const);

  const text = ['text', 'muted', 'green', 'blue', 'purple', 'gold', 'orange', 'red', 'cyan'] as const;

  for (const name of text) {
    it(`--gm-${name} clears 4.5:1 on every game surface`, () => {
      for (const [bgName, bg] of surfaces) {
        const ratio = contrast(token(name), bg);
        expect(
          Number(ratio.toFixed(2)),
          `--gm-${name} on --gm-${bgName} is ${ratio.toFixed(2)}:1`,
        ).toBeGreaterThanOrEqual(4.5);
      }
    });
  }

  it('--gm-border clears 3:1, because it is what identifies a board cell', () => {
    for (const [bgName, bg] of surfaces) {
      const ratio = contrast(token('border'), bg);
      expect(
        Number(ratio.toFixed(2)),
        `--gm-border on --gm-${bgName} is ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(3);
    }
  });

  it('keeps the supplied value recorded next to the correction', () => {
    // The one token that moved. Its supplied hex stays in a comment so the
    // change is auditable rather than silent.
    expect(css).toContain('#2a3650');
  });

  it('uses the sheet hexes for the tokens that passed', () => {
    // Transcription, not interpretation. If one of these drifts, it drifted
    // by hand rather than by measurement.
    const supplied: Record<string, Hex> = {
      bg: '#0c1220', panel: '#121a2b', 'panel-alt': '#1a2436',
      text: '#e6eaf2', muted: '#8b94a6', gold: '#f0b43c',
      green: '#39d16a', blue: '#4aa3ff', purple: '#c475ff', red: '#ff5a5a',
    };
    for (const [name, hex] of Object.entries(supplied)) {
      expect(token(name), `--gm-${name}`).toBe(hex);
    }
  });
});
