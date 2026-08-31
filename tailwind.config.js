/**
 * Design tokens.
 *
 * These class names are the NativeWind vocabulary too, so components written
 * against them port to the Expo app unchanged. That is the whole reason
 * ADR-001 picked the Tailwind dialect rather than Emotion, and it is why the
 * surface treatments below stay inside the RN-portable set: gradients and
 * box-shadow including inset, and no mask, clip-path or filter chains.
 *
 * There were five near-identical darks and they were doing nothing except
 * flattening the picture. Three now, spread further apart, with the reclaimed
 * contrast spent on brass and glow. Inscryption's shader did the same thing
 * deliberately: crush the darks, leave the bright colours alone.
 *
 * Four pairs sit near their floor. Measure before changing any of them, and
 * measure against `card`, which is the tightest background in the app:
 *
 *   steel     on card  5.05:1  (needs 4.5 — text)
 *   bad       on card  5.32:1  (needs 4.5 — jam banner text)
 *   edge      on card  3.42:1  (needs 3.0 — WCAG 1.4.11 component boundary)
 *   edge-soft on card  3.27:1  (needs 3.0 — empty cells are buttons)
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './app/index.html', './src/**/*.{ts,tsx}'],
  theme: {
    screens: {
      sm: '640px', md: '768px', lg: '1024px', xl: '1280px', '2xl': '1536px',
      // The three-column cockpit. 280 + 470 + 320 plus gutters and padding.
      cockpit: '1140px',
    },
    extend: {
      colors: {
        // The three darks. Empty board cells use `ground`, so they read as
        // holes cut in the panel rather than as a fourth shade.
        ground: '#0E1013',
        panel: '#171B21',
        card: '#1F242B',
        edge: '#6d7688',
        'edge-soft': '#6a7384',
        brass: '#d9a441',
        copper: '#c47a4e',
        steel: '#8a93a5',
        ink: '#ece7db',
        glow: '#6fd3d9',
        // Raised from #cf6a58, which was 4.35:1 on the new card and under the
        // 4.5 the jam banner needs.
        bad: '#dd7c68',
        ok: '#8cbb7d',
      },
      backgroundImage: {
        // One light direction for the whole app, top-left, matching the shadow
        // offsets below. A surface lit from somewhere else reads as a mistake.
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
      },
      animation: {
        fire: 'fire .34s',
        floatup: 'floatup .7s ease-out forwards',
        // Overshoot, so motion reads as mechanical rather than as a web page.
        // Machines accelerate and stop dead; ease-in-out is the web-page tell.
        pop: 'pop .32s cubic-bezier(.34,1.56,.64,1)',
      },
    },
  },
  plugins: [],
};
