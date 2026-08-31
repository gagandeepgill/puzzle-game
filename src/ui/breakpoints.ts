/**
 * The one place the cockpit breakpoint is a number.
 *
 * It appears four more times as a literal — the `cockpit` screen in
 * `tailwind.config.js` and three media queries in `src/ui/index.css` — because
 * neither a Tailwind config nor a stylesheet can import a TypeScript constant.
 * `src/ui/__tests__/breakpoints.test.ts` asserts they all still agree, so the
 * copies cannot drift silently the way they nearly did when this moved from
 * 1140 to 1180.
 *
 * The value is what the content needs, not a device size: 300px of HUD rail,
 * 470px of board, 348px of reference rail, plus gutters and page padding.
 */
export const COCKPIT_MIN_WIDTH = 1180;

/** The media query string, so callers cannot typo the units. */
export const COCKPIT_QUERY = `(min-width: ${COCKPIT_MIN_WIDTH}px)`;

/**
 * True when the viewport is wide enough for the three-column layout.
 *
 * Guards `matchMedia` because this module is imported by tests running under
 * node, where there is no window.
 */
export function isCockpit(): boolean {
  return typeof matchMedia === 'function' && matchMedia(COCKPIT_QUERY).matches;
}

/** The slice of MediaQueryList this module uses, so a test can supply a fake. */
export interface CockpitQuery {
  readonly matches: boolean;
  addEventListener(type: 'change', listener: (e: { matches: boolean }) => void): void;
  removeEventListener(type: 'change', listener: (e: { matches: boolean }) => void): void;
}

/**
 * Call `onChange` when the viewport crosses the cockpit breakpoint, unless the
 * player has taken the decision over.
 *
 * Extracted from the component because the interesting rule is not "subscribe
 * to a media query", it is "stop having an opinion once someone disagrees with
 * you" — and that is worth a test. It cannot be driven through the browser
 * anyway: CDP viewport emulation changes `innerWidth` and `matches` without
 * firing either a `resize` or a `change` event, which was measured, so the
 * only honest way to check this path is to call it directly.
 *
 * `isTouched` is a callback rather than a boolean so the subscription reads
 * the current value on each event instead of closing over a stale one.
 *
 * Returns an unsubscribe function, or a no-op where there is no `matchMedia`.
 */
export function watchCockpit(
  onChange: (isCockpit: boolean) => void,
  isTouched: () => boolean,
  query?: CockpitQuery,
): () => void {
  const mq = query ?? (typeof matchMedia === 'function' ? matchMedia(COCKPIT_QUERY) : null);
  if (!mq) return () => {};
  const listener = (e: { matches: boolean }) => {
    if (!isTouched()) onChange(e.matches);
  };
  mq.addEventListener('change', listener);
  return () => mq.removeEventListener('change', listener);
}
