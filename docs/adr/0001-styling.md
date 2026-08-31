# ADR-001: Styling for the TypeScript and React rewrite

**Status:** Accepted, and shipped for web in #31. **Date:** 2026-08-31.
**Related:** [`docs/PLATFORM.md`](../PLATFORM.md).

> Recorded as issue #25 while it was a proposal, and moved here when it was
> accepted. A decision that only exists in a closed issue is not a decision
> record.

## What actually shipped

The web build landed in #31 on plain Tailwind 3, not NativeWind. There is no
React Native target yet, so the native half of this ADR is still ahead of the
code. The dialect is what matters and it is the one chosen here: the class
names in `src/ui/` are the NativeWind vocabulary, so they port unchanged if
and when Expo enters the picture.

Two consequences below are already honoured. Design tokens live in
`tailwind.config.js` rather than CSS custom properties. Animation is kept out
of `className`. The marble is positioned by an inline `style` computed from
cell geometry, because a class cannot carry an interpolated pixel value, which
is exactly the limitation this ADR predicted.

One measurement in the Consequences section has since been corrected: the
`steel` on `card` floor is 4.91:1 as stated, but `edge` was 2.39:1 against the
3:1 that WCAG 1.4.11 requires, not the passing value originally claimed. Fixed
in #31.

## Context

The arcade is vanilla HTML/CSS/JS shipped as a static PWA. The plan is to rewrite it in TypeScript and React, targeting web and native mobile from one codebase.

The framework half is already decided in [`docs/PLATFORM.md`](https://github.com/gagandeepgill/puzzle-game/blob/main/docs/PLATFORM.md): Expo, React Native plus react-native-web. Reasons there: I'm a React Native engineer, `MASTER_PROMPT.md` already specs Ledger Lane that way, and an audit of the existing CSS found only two features with no clean RN equivalent (one radial-gradient, and WebAudio synthesis). That stands. This settles styling only.

The question: Emotion or Tailwind?

## Decision

Tailwind, via NativeWind 4.2.6 stable. Not v5, which is still marked pre-release.

And keep the styling library off the animation path. The marble, cell flashes and score count-up run on Reanimated shared values and the `style` prop. The styling library handles static chrome only: HUD, buttons, layout, theming.

## Why

`@emotion/native` is effectively abandoned. Last publish 2023-05-06, v11.11.0. Its `packages/native` directory was last touched 2024-12-05 and that commit was a repo-wide TypeScript conversion, not RN work. Its only peer range is `react-native: ">=0.14.0 <1"`, written before Fabric existed, and there's an open issue for RN's newer boxShadow and filter props. 80k weekly downloads against NativeWind's 1.93M. Adopting it for a multi-year cross-platform project in 2026 means betting on a dead subpackage.

The web half favours a compiled approach. NativeWind emits a real Tailwind stylesheet on web rather than injecting at render time, so SSR and first paint are clean. Emotion injects through React context at render. If a Next.js or RSC target ever enters scope, Emotion is out entirely: runtime CSS-in-JS is structurally incompatible with Server Components, and its maintainers have declined to add static extraction.

It's also the stack I already ship. NativeWind is the Ticketmaster app's styling layer, so the marginal cost is near zero. Emotion would be a new mental model plus an unmaintained dependency.

Agent tooling is lopsided. A maintained, auto-regenerated NativeWind skill exists in [hairyf/skills](https://github.com/hairyf/skills), plus Tailwind design-system and React Native styling skills in [wshobson/agents](https://github.com/wshobson/agents). There is no Claude Code skill or plugin for Emotion at all.

And the dialect has an escape hatch where the library doesn't. NativeWind is effectively a one-maintainer project, which is a real bus-factor risk. But [Uniwind](https://github.com/uni-stack/uniwind), MIT, from the Unistyles team, is a drop-in on the same className API and hit 499k weekly downloads inside a year. Choosing Tailwind doesn't lock in NativeWind. Emotion has one implementation and it's dormant.

## The case against, recorded so this isn't one-sided

The port is CSS to CSS, and Emotion speaks CSS. About 1000 lines with 5 keyframes, 4 transitions and 7 animations. Emotion takes those nearly verbatim; Tailwind needs every declaration re-expressed as a utility.

Games are full of computed styles. Tailwind's compiler scans statically, so a template-literal class with an interpolated pixel value can't work. You fall back to the `style` prop and end up running two styling systems in one component.

NativeWind fights Reanimated. [reanimated#8329](https://github.com/software-mansion/react-native-reanimated/issues/8329) has classes silently not applied on `Animated.View`; [nativewind#1560](https://github.com/nativewind/nativewind/issues/1560) has `useAnimatedRef` broken with Reanimated 4; class-based animations are still experimental and inconsistent across iOS and Android. That lands squarely on a game whose defining feature is an animated marble.

Setup surface. Metro plus Babel plus PostCSS plus a global stylesheet, and it has broken on Expo SDK bumps. Emotion has no plugin chain to break.

Emotion has better types. A ThemeProvider with module augmentation is compile-checked; `className: string` isn't.

Why it still loses: the first two arguments point at inline style objects plus Reanimated, which is the architecture chosen here anyway, not at Emotion specifically. The third argues for keeping animation out of className, which this ADR adopts regardless. None of them survive the maintenance problem.

## Performance isn't the deciding factor

The only cross-library benchmark ([efstathiosntonas](https://github.com/efstathiosntonas/react-native-style-libraries-benchmark), 250 views, Expo SDK 52) has every library beating plain StyleSheet, which is impossible. The spread is noise. This game has about 30 cells, an order of magnitude fewer.

There's one real counter-point: [nativewind#642](https://github.com/nativewind/nativewind/discussions/642) measured v4.0 at roughly 400% slower than StyleSheet at 1000 views in 2023. That was attributed to an upstream Reanimated bug, measured at 33x this game's node count, and has since been addressed.

At 30 cells the styling library isn't the bottleneck. React re-render count and the animation driver are. Drive the marble with Reanimated shared values off the JS thread, give cells stable identity with `React.memo`, and let the styling library handle static chrome. This is a developer-ergonomics call, recorded as such so nobody re-litigates it on benchmark grounds.

## Alternatives

**Plain StyleSheet** is viable and the zero-dependency baseline. react-native-web statically extracts it to real CSS. Rejected on authoring ergonomics: no variants, dark mode or responsive without hand-rolling.

**Unistyles v3** has the strongest performance story, C++/Nitro with shadow-tree updates and zero React re-renders. Rejected because Reanimated already solves the animation path and the API isn't one I know.

**Tamagui** is the most ambitious RN-plus-web answer but has 800+ v3 betas in flight. A compiler is the biggest new failure surface here and a v3 landing mid-port is a scheduling risk.

**Shopify Restyle** has lovely typed token discipline and is effectively dormant, five publishes since 2023.

**Uniwind** isn't rejected. It's the named fallback if NativeWind stalls or v5 stays pre-release.

## Consequences

Animations stay out of className. This needs writing down, not remembering. It's the main way this decision goes wrong.

Tailwind config becomes home for the design tokens currently in CSS custom properties. The palette and scale in `.claude/skills/game-typography` port there, including the `--steel` on `--card` contrast floor at 4.91:1 with 0.41 of headroom.

Pin NativeWind. Don't track v5 until it drops the pre-release warning.

Expo SDK upgrades carry NativeWind setup risk. Treat an SDK bump as a task, not a chore.

## What would change this

If the board is rendered on a Skia or canvas surface rather than 30 View nodes, there's no styling hot path and porting the CSS verbatim gets cheaper. Settle the render model before writing styling code.

If NativeWind v5 is required and still pre-release at port time, switch to Uniwind, which is Tailwind-v4-only and stable. Implementation swap, not a strategy change.

If a Next.js or RSC web target enters scope, Emotion becomes impossible rather than unwise, which hardens this from preference to constraint.

## Checklist

- [ ] Confirm the render model, View tree or Skia, before writing styling code
- [ ] Pin NativeWind 4.2.6; don't adopt v5 while pre-release
- [x] Port design tokens from CSS custom properties into the Tailwind theme
- [x] Write the no-animations-in-className rule somewhere an agent will read it
- [ ] Prototype one animated cell with Reanimated and NativeWind together before committing the UI
- [ ] Record Uniwind as the fallback
