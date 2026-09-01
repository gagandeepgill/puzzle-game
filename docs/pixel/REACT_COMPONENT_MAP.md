# PAYLOAD Pixel UI — React Component Map

Use the visual reference:

`/docs/pixel/hud-sources/reference/payload-ui-hud-asset-sheet.png`

Do not render that image as the application.

The image defines appearance; React renders live game state.

## Suggested presentation tree

```tsx
<PixelGameView>
  <PixelHeader />

  <PixelGameplayGrid>
    <PixelHudRail />
    <PixelBoard />
    <PixelSupportRail />
  </PixelGameplayGrid>

  <PixelDraftArea />
  <PixelFooterControls />
</PixelGameView>
```

Names are suggestions only.

## Mapping

| Visual reference area | React responsibility |
|---|---|
| PAYLOAD title | PixelHeader |
| Round / Score | PixelHeader live state |
| Quota | PixelHudRail |
| Drops | PixelHudRail / PixelDrops |
| Banked | PixelHudRail |
| 5×6 board | existing board state + Pixel presentation |
| Board cells | existing interaction semantics + Pixel CSS |
| Part art | PixelPart |
| Marble | PixelMarble |
| Jam panel | PixelJamPanel |
| Blueprint panel | PixelBlueprintPanel |
| 3 Draft cards | PixelDraftArea / PixelDraftCard |
| Card interaction states | CSS + existing selection state |
| Valid/invalid placement | cell state classes |
| Buttons | reusable PixelButton |
| Score pops | playback overlay |
| Part activation effects | playback-driven animation |
| Mobile reference | responsive CSS |

## Asset mapping

```ts
export const PIXEL_PART_ASSETS = {
  weight: "/assets/pixel/parts/weight.webp",
  anvil: "/assets/pixel/parts/anvil.webp",
  coil: "/assets/pixel/parts/coil.webp",
  prism: "/assets/pixel/parts/prism.webp",
  spring: "/assets/pixel/parts/spring.webp",
  wire: "/assets/pixel/parts/wire.webp",
  reso: "/assets/pixel/parts/reso.webp",
  fork: "/assets/pixel/parts/fork.webp",
  gate: "/assets/pixel/parts/gate.webp",
  bell: "/assets/pixel/parts/bell.webp",
} as const;
```

Other assets:

```ts
export const PIXEL_UI_ASSETS = {
  marble: "/assets/pixel/marbles/marble-blue.webp",
  jam: "/assets/pixel/ui/jam.webp",
  blueprints: "/assets/pixel/ui/blueprints.webp",
  cell: "/assets/pixel/tiles/cell.webp",
} as const;
```

## PixelPart

```tsx
function PixelPart({
  partKey,
  className = "",
}: {
  partKey: keyof typeof PIXEL_PART_ASSETS;
  className?: string;
}) {
  return (
    <img
      src={PIXEL_PART_ASSETS[partKey]}
      alt=""
      aria-hidden="true"
      draggable={false}
      className={`pixel-part ${className}`}
    />
  );
}
```

## Styling

```css
.pixel-part,
.pixel-marble,
.pixel-icon {
  image-rendering: pixelated;
  image-rendering: crisp-edges;
}
```

## Important implementation rule

Simple UI rectangles, cards, panels, borders, progress bars, and buttons should normally be CSS, not cropped from the reference PNG.

Use raster assets for:
- part artwork
- marble artwork
- icon artwork
- authored effect frames

Use React/CSS for:
- layout
- text
- data
- buttons
- progress
- state
- responsive behavior

## State rule

Never copy reference values such as example score, quota, or round numbers.

Always bind to the current game state.

## Classic

Keep Classic presentation intact.

Pixel can have its own presentational component tree but must share the existing game state/actions.
