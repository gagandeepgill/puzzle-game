/**
 * Design tokens, moved out of the CSS custom properties in demo/payload.html.
 *
 * These class names are the NativeWind vocabulary too, so components written
 * against them port to the Expo app unchanged. That is the whole reason
 * ADR-001 picked the Tailwind dialect rather than Emotion.
 *
 * Do not darken `steel` or lighten `card`. Measured at 4.91:1 against a 4.5:1
 * requirement, so that pair has 0.41 of headroom and no more.
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
        // Raised from #30353f, which measured 1.36:1 against the 3:1 that
        // WCAG 1.4.11 requires for component boundaries.
        edge: '#58606e',
        'edge-soft': '#3a4150',
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
