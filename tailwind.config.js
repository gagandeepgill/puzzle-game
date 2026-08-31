/**
 * Design tokens.
 *
 * These class names are the NativeWind vocabulary too, so components written
 * against them port to the Expo app unchanged. That is the whole reason
 * ADR-001 picked the Tailwind dialect rather than Emotion, and it is why the
 * surface treatments below stay inside the RN-portable set: gradients and
 * box-shadow including inset, and no mask, clip-path or filter chains.
 *
 * ## Surfaces
 *
 * One light, top-left, for the whole app. Four tiers, each lighter than the
 * one it sits on, because in a dark UI depth reads as a surface catching more
 * light rather than as a heavier shadow:
 *
 *   ground    the hole a recess is cut into
 *   panel     a housing: HUD, rails, the board frame, the modal
 *   raised    something you can press: buttons, draft cards, stat tiles
 *   machined  a part installed on the board, the most lit thing there is
 *
 * Each gradient is paired with a shadow of the same tier, and every raised
 * tier carries an inset top highlight. Pressed states invert to `shadow-sunk`
 * so a press is a physical event and not just a colour change.
 *
 * ## The contrast floors
 *
 * Lighting the surfaces raised the tightest background in the app from `card`
 * (#1F242B) to the machined gradient's top stop (#2b313b), which broke four
 * pairs that had been passing. `steel`, `edge` and `bad` were nudged up until
 * every text token clears its floor on every surface. Worst case per token,
 * all measured against #2b313b:
 *
 *   ink     10.60:1     steel    4.51:1     brass   5.82:1     glow  7.47:1
 *   ok       5.93:1     bad      4.51:1     copper  4.50:1     edge  3.02:1
 *
 * Text needs 4.5, a component boundary needs 3.0 (WCAG 1.4.11). There is no
 * headroom left in `steel`, `bad`, `copper` or `edge`: lightening any surface
 * further means re-solving them.
 *
 * Those numbers are asserted, not promised. `src/ui/__tests__/contrast.test.ts`
 * reads this file, walks every foreground against every flat dark and every
 * gradient's lit top stop, and fails the build if one drops below its floor.
 * This comment was wrong twice before that test existed: it named `card` as the
 * tightest background, which stopped being true the day `bg-machined` shipped
 * and left the board's own cell borders at 2.86:1 for months. Do not hand-edit
 * the table — run the test and copy what it measures.
 *
 * `edge-soft` used to be a separate token. Solving both against the new
 * lightest surface landed them on the same value, so it is gone rather than
 * kept as a second name for one colour.
 *
 * ## The type scale
 *
 * Sizes are `--t-*` custom properties in rem, set on `:root` in index.css and
 * stepped up at 768 and 1180. Three reasons it is not 70 hardcoded px values
 * any more: px meant a player who raises their browser's default font size got
 * no scaling at all (verified, not assumed — WCAG 1.4.4), the desktop cockpit
 * was showing phone-sized text on a 27" monitor, and 16 arbitrary sizes
 * between 9.5px and 30px is not a scale.
 *
 * The tokens are roles, not sizes, so a component says what a string is for
 * and the scale decides how big that is on this viewport.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './app/index.html', './src/**/*.{ts,tsx}'],
  // Compiles `hover:` to `@media (hover: hover)`. Without it a phone applies
  // the hover state on tap and leaves it stuck there until something else is
  // touched, which reads as a selection the player did not make. Desktop is
  // where hover feedback belongs; this is what keeps it there.
  future: { hoverOnlyWhenSupported: true },
  theme: {
    screens: {
      sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px',
      // The three-column cockpit. 300 + 470 + 348 plus gutters and padding.
      // Was 1140 with narrower rails; the rails grew to pay for the bigger
      // type, because raising body size inside a fixed-width column just
      // trades one readability problem for a 30-character line.
      cockpit: '1180px',
    },
    extend: {
      colors: {
        // The three darks. Empty board cells use `ground`, so they read as
        // holes cut in the panel rather than as a fourth shade.
        ground: '#0E1013',
        panel: '#171B21',
        card: '#1F242B',
        // 3.02:1 on the machined gradient's top stop, against the 3.0 that
        // WCAG 1.4.11 requires of a component boundary. Was #6d7688, which
        // measured 2.86 there once the cells were lit.
        edge: '#707a8c',
        brass: '#d9a441',
        // 4.50:1 on the same stop. Only ever a gradient stop, never text, but
        // solved anyway so the table above has no exceptions in it.
        copper: '#d48454',
        // 4.51:1. Was #8a93a5 at 4.23, under the 4.5 body text requires.
        steel: '#8f98ab',
        ink: '#ece7db',
        glow: '#6fd3d9',
        bad: '#de7d69',
        ok: '#8cbb7d',
      },
      fontSize: {
        // Role, not size. Values live in index.css so one media query moves
        // the whole app's type rather than 70 call sites.
        micro: ['var(--t-micro)', { lineHeight: '1.2' }],
        label: ['var(--t-label)', { lineHeight: '1.25' }],
        meta: ['var(--t-meta)', { lineHeight: '1.45' }],
        body: ['var(--t-body)', { lineHeight: '1.5' }],
        lead: ['var(--t-lead)', { lineHeight: '1.4' }],
        stat: ['var(--t-stat)', { lineHeight: '1.05' }],
        head: ['var(--t-head)', { lineHeight: '1.12' }],
        payout: ['var(--t-payout)', { lineHeight: '1.1' }],
      },
      backgroundImage: {
        // One light direction for the whole app, top-left, matching the shadow
        // offsets below. A surface lit from somewhere else reads as a mistake.
        'panel-lit': 'linear-gradient(160deg, #1d222b 0%, #171B21 55%, #12161b 100%)',
        'raised': 'linear-gradient(160deg, #282e38 0%, #1F242B 52%, #191d23 100%)',
        'machined': 'linear-gradient(160deg, #2b313b 0%, #1F242B 46%, #171b21 100%)',
        'machined-brass': 'linear-gradient(160deg, #e8bd63 0%, #d9a441 45%, #9c7025 100%)',
      },
      boxShadow: {
        // Bevel plus depth. Offsets double and opacity drops per layer, which
        // is what reads as one distant light rather than a stack of glows.
        machined: [
          'inset 0 1px 0 rgba(236,231,219,.13)',
          'inset 0 -1px 0 rgba(0,0,0,.55)',
          '0 1px 1px rgba(0,0,0,.5)',
          '0 2px 4px rgba(0,0,0,.32)',
          '0 6px 12px rgba(0,0,0,.22)',
        ].join(','),
        // A housing. Sits on the page rather than on another panel, so its
        // cast shadow is wide and soft and its top highlight is faint.
        panel: [
          'inset 0 1px 0 rgba(236,231,219,.07)',
          'inset 0 -1px 0 rgba(0,0,0,.4)',
          '0 1px 2px rgba(0,0,0,.35)',
          '0 10px 24px rgba(0,0,0,.26)',
        ].join(','),
        // Anything you can press. Between panel and machined, so a button on
        // a panel reads as proud of it and a board part still outranks both.
        raised: [
          'inset 0 1px 0 rgba(236,231,219,.10)',
          'inset 0 -1px 0 rgba(0,0,0,.45)',
          '0 1px 2px rgba(0,0,0,.45)',
          '0 3px 6px rgba(0,0,0,.25)',
        ].join(','),
        // The pressed state of `raised`, and the empty-cell recess. Same
        // physics either way: light no longer reaches the top edge.
        sunk: [
          'inset 0 2px 4px rgba(0,0,0,.55)',
          'inset 0 -1px 0 rgba(236,231,219,.05)',
        ].join(','),
        // A cell holding a part sits proud of the board; an empty one is a
        // recess, so its bevel is inverted.
        recess: [
          'inset 0 2px 3px rgba(0,0,0,.55)',
          'inset 0 -1px 0 rgba(236,231,219,.06)',
        ].join(','),
        marble: [
          'inset -3px -4px 7px rgba(0,0,0,.55)',
          'inset 2px 2px 3px rgba(255,255,255,.25)',
          '0 3px 6px rgba(0,0,0,.6)',
          '0 0 14px rgba(217,164,65,.45)',
          '0 0 30px rgba(217,164,65,.18)',
        ].join(','),
      },
      fontFamily: {
        // Fraunces carries identity and result numbers. Outfit carries
        // everything operational. Keeping them separate is what stops the
        // UI reading as generic.
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Outfit', 'Segoe UI', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        fire: {
          '30%': { transform: 'scale(1.16)', borderColor: '#d9a441' },
        },
        floatup: {
          from: { opacity: '1' },
          to: { opacity: '0', transform: 'translateY(-26px)' },
        },
        pop: {
          from: { opacity: '0', transform: 'translateY(16px) scale(.94)' },
        },
        // Three tiers, tied to what the drop was worth against the quota. Only
        // the largest rotates; rotation on a small hit reads as a glitch.
        'shake-1': {
          '25%': { transform: 'translate(1px, -1px)' },
          '75%': { transform: 'translate(-1px, 1px)' },
        },
        'shake-2': {
          '20%': { transform: 'translate(-3px, 2px)' },
          '50%': { transform: 'translate(3px, -2px)' },
          '80%': { transform: 'translate(-2px, 1px)' },
        },
        'shake-3': {
          '15%': { transform: 'translate(-5px, 3px) rotate(-.5deg)' },
          '40%': { transform: 'translate(5px, -3px) rotate(.5deg)' },
          '65%': { transform: 'translate(-4px, 2px) rotate(-.3deg)' },
          '85%': { transform: 'translate(3px, -1px)' },
        },
      },
      animation: {
        fire: 'fire .34s',
        floatup: 'floatup .7s ease-out forwards',
        // Overshoot, so motion reads as mechanical rather than as a web page.
        // Machines accelerate and stop dead; ease-in-out is the web-page tell.
        pop: 'pop .32s cubic-bezier(.34,1.56,.64,1)',
        'shake-1': 'shake-1 .2s ease-out',
        'shake-2': 'shake-2 .3s ease-out',
        'shake-3': 'shake-3 .5s ease-out',
      },
    },
  },
  plugins: [],
};
