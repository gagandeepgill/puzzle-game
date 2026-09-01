# PAYLOAD SIMPLE PIXEL — MASTER IMPLEMENTATION PROMPT

Implement the complete **Simple Pixel** presentation for the existing PAYLOAD React + TypeScript game.

This document is the authoritative implementation prompt for the Pixel skin.

Use:

`/public/assets/pixel/reference/payload-ui-hud-asset-sheet.png`

as the visual target.

The reference image defines:
- layout composition
- density
- visual hierarchy
- panel language
- spacing
- border treatment
- Pixel HUD styling
- button states
- draft-card styling
- mobile composition
- animation feel

The reference image does **not** define gameplay values or rules.

The existing repo is the source of truth for:
- game rules
- scoring
- state
- playback
- part behavior
- Jams
- Blueprints
- labels and descriptions
- accessibility semantics

---

# 1. CORE GOAL

The final Pixel skin should look like a genuinely redesigned game presentation.

It should NOT look like:

```text
old PAYLOAD layout
+ new colors
+ pixel sprites
```

It should look like:

```text
existing PAYLOAD game logic
+ dedicated Pixel page composition
+ supplied Pixel art
+ playback-driven animations
+ compact retro HUD
```

The board remains the visual focus.

---

# 2. DO NOT CHANGE GAME RULES

Preserve the existing game engine.

Known presentation facts:

- Board: 5 columns × 6 rows
- Draft: exactly 3 offers
- HUD includes real Round, Score, Quota, Drops left, and Banked state
- Jams use existing Jam state/content
- Blueprints use existing Blueprint state/content
- Part behavior comes from the existing game code/content

Do not add:

- currency
- gold economy
- shops
- reroll costs
- lives
- energy
- boss systems
- new HUD resources
- fake round-summary mechanics
- fake End Round controls
- any mechanic shown only in concept art

If the visual reference contains placeholder numbers or text, replace them with actual runtime state.

---

# 3. ACTUAL PART KEYS

Use these exact keys:

```ts
type PixelPartKey =
  | "weight"
  | "anvil"
  | "coil"
  | "prism"
  | "spring"
  | "wire"
  | "reso"
  | "fork"
  | "gate"
  | "bell";
```

Do not rename game keys to match visual labels.

---

# 4. PIXEL SKIN ARCHITECTURE

Pixel may have a dedicated presentation component.

Recommended concept:

```tsx
return skin === "pixel"
  ? <PixelGameView {...viewProps} />
  : <ClassicGameView {...viewProps} />;
```

Share:
- state
- hooks
- game logic
- playback
- actions

Do not duplicate the game engine.

It is acceptable and encouraged to create dedicated Pixel presentational components if the Classic composition prevents matching the reference.

---

# 5. DEFAULT SKIN

Use:

```ts
type GameSkin = "classic" | "pixel";
```

Set:

```ts
const DEFAULT_GAME_SKIN: GameSkin = "pixel";
```

Persist the selected skin.

Keep Classic available.

Do not delete the old presentation.

---

# 6. DESKTOP PAGE COMPOSITION

At approximately 1280×800 and above, the Pixel screen should visually follow:

```text
┌───────────────────────────────────────────────────────────────┐
│ PAYLOAD                         ROUND X / X      SCORE XXXXX  │
├───────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌─────────────┐     ┌─────────────────────┐  ┌────────────┐ │
│  │ QUOTA       │     │                     │  │ JAM        │ │
│  │ XX / XX     │     │                     │  │            │ │
│  │ █████░░     │     │       5 × 6         │  ├────────────┤ │
│  ├─────────────┤     │       BOARD         │  │BLUEPRINTS  │ │
│  │ DROPS       │     │                     │  │            │ │
│  │ ● ● ●       │     │                     │  │            │ │
│  ├─────────────┤     └─────────────────────┘  └────────────┘ │
│  │ BANKED      │                                             │
│  │ XX          │                                             │
│  └─────────────┘                                             │
│                                                               │
│                    DRAFT: CHOOSE 1 PART                       │
│                                                               │
│               [ CARD ] [ CARD ] [ CARD ]                      │
│                                                               │
│                  secondary / primary actions                  │
└───────────────────────────────────────────────────────────────┘
```

The actual data comes from the game.

The visual proportions should follow the reference sheet.

---

# 7. PAGE WIDTH

Use a centered Pixel shell.

Suggested starting point:

```css
.pixel-game {
  width: min(1180px, calc(100% - 32px));
  margin-inline: auto;
}
```

Do not stretch every panel across ultrawide screens.

---

# 8. HEADER

Use a thin header.

Left:
- PAYLOAD wordmark

Right:
- Round
- Score
- compact menu/settings controls

The header should not dominate vertically.

Avoid giant navigation bars.

---

# 9. LEFT HUD RAIL

Desktop left rail:

1. Quota
2. Drops
3. Banked

Quota:
- label
- current / target
- progress bar

Drops:
- use actual drops-left state
- compact indicators or count

Banked:
- actual banked state

Use compact stacked panels.

Do not create oversized dashboard cards.

---

# 10. BOARD

The 5×6 board is the visual hero.

Requirements:
- exact real board state
- tightly packed cells
- thin outer frame
- narrow gaps
- dark flat cell backgrounds
- crisp sprites
- no thick industrial machinery around it

Suggested cell size on desktop:

```css
width: clamp(52px, 5vw, 64px);
aspect-ratio: 1;
```

Tune from the live viewport.

Do not sacrifice all surrounding UI just to maximize the board; match the reference proportions.

---

# 11. RIGHT SUPPORT RAIL

Desktop right rail:

- Jam
- Blueprints

These are supporting panels.

They must not visually compete with the board.

Jam:
- actual active/current Jam state
- icon
- real name/rule if currently shown by the game

Blueprints:
- actual Blueprint state
- compact icon/list treatment

---

# 12. DRAFT AREA

Place drafting below the board area.

Exactly 3 real offers.

```text
DRAFT: CHOOSE 1 PART

[ OFFER 1 ] [ OFFER 2 ] [ OFFER 3 ]
```

Each card:
- supplied part sprite
- actual part name
- actual description/rule
- current selection state
- current disabled state

Cards should be noticeably smaller than the board.

---

# 13. VISUAL LANGUAGE

Use:
- dark navy / charcoal base
- 1–2px borders
- square or very small corner radius
- crisp Pixel artwork
- restrained glow
- minimal shadows
- strong hierarchy
- generous negative space

Avoid:
- huge rounded cards
- giant blurred neon
- heavy pipes
- screw decorations
- excessive beveling
- thick frames
- layered dashboard clutter

---

# 14. COLOR TOKENS

Recommended:

```css
.pixel-skin {
  --px-bg: #08111b;
  --px-panel: #0d1722;
  --px-panel-alt: #101a24;

  --px-border: #263544;
  --px-border-bright: #506174;

  --px-text: #edf1ee;
  --px-muted: #8f98ab;

  --px-green: #7bd33e;
  --px-blue: #19a5f4;
  --px-purple: #a449e6;
  --px-gold: #f4b825;
  --px-orange: #f07808;
  --px-red: #d94b56;
  --px-cyan: #6fd3d9;
}
```

Do not turn whole panels neon.

---

# 15. PANEL SYSTEM

Use reusable CSS instead of raster images for simple boxes.

```css
.pixel-panel {
  background: var(--px-panel);
  border: 1px solid var(--px-border);
  box-shadow: 0 3px 0 rgba(0, 0, 0, 0.35);
}
```

The reference sheet is a visual guide, not an image map.

---

# 16. BUTTON SYSTEM

Build reusable button states from CSS.

Required states:
- idle
- hover
- pressed
- selected where relevant
- disabled
- keyboard focus

Do not create buttons for non-existent actions.

---

# 17. BOARD PLACEMENT STATES

Valid placement:
- subtle green border/fill cue

Invalid placement:
- subtle red cue

Do not change placement rules.

Do not rely only on color if existing accessibility semantics can expose the state.

---

# 18. RESPONSIVE / MOBILE

At narrow widths, do not squash the desktop 3-column layout.

Target order:

```text
PAYLOAD / ROUND / SCORE

QUOTA / DROPS / BANKED

JAM

BOARD

BLUEPRINTS

DRAFT

CONTROLS
```

Requirements:
- all 5 board columns remain visible
- board stays centered
- no page-level horizontal overflow
- draft remains readable
- touch targets remain comfortable
- reduce surrounding spacing before making the board too small

Use the mobile panel in the reference sheet as the visual guide.

---

# 19. ANIMATION PHILOSOPHY

Animations explain gameplay.

They are not decorative idle loops.

Default feel:
- snappy
- readable
- slight physicality
- minimal bounce except Spring
- local effects, not screen-wide effects

Use actual playback events as triggers.

Do not create a second timing simulation.

Detailed animation rules live in:

`ANIMATION_SPEC.md`

---

# 20. AUDIO

Use the existing Pixel audio engine / existing `src/ui/audio.ts` architecture.

Do not block UI completion because WAV files are absent.

Audio paths and behavior live in:

`AUDIO_INTEGRATION.md`

Missing audio must fail gracefully.

---

# 21. ACCESSIBILITY

Preserve:
- keyboard controls
- focus order
- button semantics
- ARIA labels
- contrast
- current interaction semantics
- existing tests

Support:

```css
@media (prefers-reduced-motion: reduce)
```

Reduced motion should simplify animation without hiding state changes.

Do not infer that reduced motion means mute.

---

# 22. IMPLEMENTATION ORDER

1. Read all files in `docs/pixel/`.
2. Inspect the current UI/component/state architecture.
3. Identify reusable state and actions.
4. Create/refactor the dedicated Pixel presentation.
5. Implement full desktop composition.
6. Wire real HUD values.
7. Wire the real 5×6 board.
8. Wire supplied part/marble/UI assets.
9. Wire Jam and Blueprints.
10. Wire exactly 3 Draft offers.
11. Implement interaction states.
12. Implement responsive/mobile layout.
13. Connect playback-driven animations.
14. Preserve existing audio hooks.
15. Set Pixel as default.
16. Verify Classic still works.
17. Run tests/build.
18. Open Pixel around 1280×800.
19. Compare visually to the reference image.
20. Make one intentional refinement pass.
21. Check mobile around 375px width.
22. Re-run tests/build.

Do not stop after the first compiling layout.

---

# 23. DEFINITION OF DONE

Pixel is done when:

- full page resembles the supplied reference
- board is the visual focus
- entire composition is redesigned, not just recolored
- real 5×6 board is used
- exactly 3 real draft offers
- all 10 real part sprites work
- marble sprite works
- Jam/Blueprint presentation uses real state
- Round/Score/Quota/Drops/Banked use real state
- animation follows actual playback
- desktop composition matches reference proportions
- mobile is playable
- Pixel is default
- Classic remains selectable
- accessibility is preserved
- tests/build pass
- no fake mechanics were introduced

When uncertain about a gameplay rule, inspect the existing game code instead of guessing.
