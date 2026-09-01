# PAYLOAD Pixel UI — Asset Paths

## Visual reference

```text
/docs/pixel/hud-sources/reference/payload-ui-hud-asset-sheet.png
```

This is a visual guide only.

Do not render it as the application.

## Parts

```text
/public/assets/pixel/parts/weight.webp
/public/assets/pixel/parts/anvil.webp
/public/assets/pixel/parts/coil.webp
/public/assets/pixel/parts/prism.webp
/public/assets/pixel/parts/spring.webp
/public/assets/pixel/parts/wire.webp
/public/assets/pixel/parts/reso.webp
/public/assets/pixel/parts/fork.webp
/public/assets/pixel/parts/gate.webp
/public/assets/pixel/parts/bell.webp
```

## Marble

```text
/public/assets/pixel/marbles/marble-blue.webp
```

## UI icons

```text
/public/assets/pixel/ui/jam.webp
/public/assets/pixel/ui/blueprints.webp
```

## Board tile

```text
/public/assets/pixel/tiles/cell.webp
```

## Existing optional effect sheets

If present in the repo, reuse supplied sprite/effect sheets rather than inventing a second asset system.

## Runtime path convention

Files under `public/` are referenced without the `/public` prefix.

Example:

```tsx
<img src="/assets/pixel/parts/coil.webp" alt="" />
```

## Missing-asset behavior

A missing cosmetic asset should not alter gameplay logic.

Fix paths or fall back visually without changing the game engine.
