/**
 * The version string Vite substitutes at build time, from `package.json`.
 *
 * Declared rather than imported so no component depends on the shape of
 * `package.json`, and so a test running outside Vite fails loudly on the
 * missing global instead of quietly printing `undefined`.
 */
declare const __APP_VERSION__: string;
