/**
 * Design tokens, moved out of the CSS custom properties in public/payload.html.
 *
 * These class names are the NativeWind vocabulary too, so components written
 * against them port to the Expo app unchanged. That is the whole reason
 * ADR-001 picked the Tailwind dialect rather than Emotion.
 *
 * Two pairs here are close to their floor. Measure before changing either.
 *
 *   steel on card  4.91:1  (needs 4.5:1 — text)
 *   edge  on card  3.32:1  (needs 3:1 — WCAG 1.4.11 component boundary)
 *
 * `card` is the tightest background for both, so any new colour has to be
 * checked against #22262e and not against `panel` or `ground`.
 */
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ground: '#131519',
        panel: '#1b1e24',
        card: '#22262e',
        // Both raised twice. #30353f was 1.36:1 on card and #58606e was 2.39:1,
        // still under the 3:1 WCAG 1.4.11 wants for a component boundary.
        // These clear it on every background the app uses.
        edge: '#6d7688',
        // Empty cells are buttons, so their dashed border is a boundary too.
        // Kept a step below `edge` for hierarchy: 3.22:1 on the #191c22 fill.
        'edge-soft': '#636c7c',
        brass: '#d9a441',
        copper: '#c47a4e',
        steel: '#8a93a5',
        ink: '#ece7db',
        glow: '#6fd3d9',
        bad: '#cf6a58',
        ok: '#8cbb7d',
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
        pop: 'pop .32s cubic-bezier(.2,.9,.3,1.1)',
      },
    },
  },
  plugins: [],
};
