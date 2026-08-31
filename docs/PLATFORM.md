# Platform plan — PWA now, native later

**Decision (2026-08-31): ship as an installable PWA; keep the App Store path open
but don't pay for it yet.**

The arcade is a static site with no backend, no accounts and no tracking, so a PWA
costs nothing to run, has no review process, and is live the moment `main` is
pushed. Store presence is a later, optional step — not a prerequisite, and not
something the current architecture forecloses.

## What "keeping the path open" actually means

The transition risk for a browser game is that it depends on web APIs with no
native equivalent. That was audited against the real code rather than assumed:

| CSS/JS feature in use | React Native equivalent | Port cost |
|---|---|---|
| `@keyframes` ×5, `transition` ×4, `animation` ×7 | Reanimated 4's CSS animations API (`animationName`, `transitionDuration`, keyframe objects) | near 1:1 |
| `::before` ×2 | both are the same ▸ disclosure glyph → a `<Text>` | none |
| `backdrop-filter: blur()` | `expo-blur`'s `<BlurView>` | drop-in |
| `:hover` ×5 | `Pressable` states (moot on touch) | none |
| CSS grid, `dvh`, `@media`, `env(safe-area-*)` | flexbox, `useWindowDimensions`, `react-native-safe-area-context` | none |
| `aspect-ratio`, `box-shadow` (incl. `inset`) | supported directly in RN | none |
| **`radial-gradient`** (the marble's shading) | **no core equivalent** — `react-native-svg`, or a solid fill plus a highlight view | small, one 26px element |
| **WebAudio oscillators** (the blips) | **no equivalent — RN cannot synthesise audio.** `expo-audio` plays files only | bake ~8 sounds offline via `OfflineAudioContext`, ship as assets |

Nothing load-bearing fails. The two genuine gaps are cosmetic (one gradient) and
bounded (pre-render the sounds). This audit is the reason the recommendation is
"rewrite the view layer in Expo when the time comes" rather than "wrap the web app
in a WebView".

**Re-run this audit before committing to the port** — if a future feature adds
`clip-path`, `mask`, filter chains, or cascade-dependent state styling, the maths
changes and an Expo shell hosting the existing HTML becomes the better answer.

## The order of work, when it's time

1. **Extract the rules engine.** Pull the pure logic — `runMarble`'s part maths,
   `TILES`/`DIFFS`/`VARIANTS`, the daily seeding, and Ledger's `computePath`,
   `scorePath` and `solve` — out of the DOM code into renderer-agnostic modules.
   This is roughly 40% of each file, it is already nearly separable, and it turns
   the port into a rendering job instead of a rewrite. It also finally makes the
   tuned logic unit-testable, which is worth doing on its own merits.
   *Deliberately not done yet: abstraction with no second consumer is speculative.*
2. **Expo app** (SDK 57+) consuming those modules, with `expo export --platform web`
   regenerating the web build from the same source — so there is never a second
   implementation to maintain.
3. **Store submission**, once there is evidence anyone wants it.

## Things to know before starting step 3

- **Apple $99/year; Google $25 once.**
- **Google Play's tester rule is calendar time, not code time.** New *personal*
  accounts need 12 testers opted in for 14 unbroken days before production access.
  Start that clock weeks before you need it, or register an organisation account,
  which is exempt.
- **No Mac required** — EAS Build compiles and submits from cloud macOS workers,
  and its free tier (15 iOS + 15 Android builds/month) is ample at solo cadence.
- **Privacy labels are trivially "Data Not Collected"** while there are no
  accounts, ads, analytics or network calls. Keep it that way as long as possible;
  the labels must stay accurate, and inaccurate ones are a common rejection cause.
- **DSA trader status:** declared traders have their name and *physical address*
  published on EU store listings. Decide this *before* adding in-app purchases,
  not after.
- App Store guideline **4.7** (the Nov 2025 revision naming "HTML5 mini games") is
  widely misread as banning bundled web games. It governs software *not embedded
  in the binary* — mini-app host platforms. Bundled games are embedded.

## Known web-platform limits we are living with

- **Safari evicts script-writable storage after 7 days without interaction.**
  Home-screen-installed PWAs are largely exempt and a daily player never trips it,
  but a lapsed player can return to a wiped streak — precisely the person you most
  want back. **Treat `localStorage` as a cache, never as the record.** The planned
  mitigation is a Wordle-style export/import code so a streak can be carried by
  hand; a real fix needs an account system, which is a bigger decision.
- **iOS web push requires the site to be installed to the home screen first**, so
  opt-in rates are far below native. Daily-streak reminders are a genuine reason to
  go native eventually — but not before there are players to remind.
