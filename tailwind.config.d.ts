/**
 * The config is plain JS, because Tailwind's CLI and PostCSS load it directly.
 * `src/ui/__tests__/contrast.test.ts` imports it to assert the contrast floors
 * against the real token values rather than a copy, and under `strict` that
 * import needs a declaration.
 *
 * Deliberately narrow: it declares only what the test reads. Widening it to
 * Tailwind's own `Config` type would make the test compile against fields it
 * does not use and would not catch a token being renamed.
 */
declare const config: {
  theme: {
    extend: {
      colors: Record<string, string>;
      backgroundImage: Record<string, string>;
    };
  };
};
export default config;
