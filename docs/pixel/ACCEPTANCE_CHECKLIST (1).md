# PAYLOAD Pixel UI — Acceptance Checklist

Claude should not consider the Pixel implementation complete until these pass.

## Visual composition

- [ ] Pixel has a dedicated full-page composition.
- [ ] It does not look like the Classic layout with different colors.
- [ ] Board is the strongest visual element.
- [ ] Header is compact.
- [ ] Quota / Drops / Banked form a compact supporting HUD.
- [ ] Jam / Blueprints are supporting panels.
- [ ] Draft sits below gameplay and shows exactly 3 offers.
- [ ] Page is centered and not stretched awkwardly on wide screens.
- [ ] Layout resembles `/public/assets/pixel/reference/payload-ui-hud-asset-sheet.png`.

## Game correctness

- [ ] Real 5×6 board is used.
- [ ] Real Round value is shown.
- [ ] Real Score is shown.
- [ ] Real Quota state is shown.
- [ ] Real Drops-left state is shown.
- [ ] Real Banked state is shown.
- [ ] Real Jam state/content is shown.
- [ ] Real Blueprint state/content is shown.
- [ ] Exactly 3 real draft offers are shown.
- [ ] No invented mechanics were added.
- [ ] No game-rule logic was changed for visual reasons.

## Assets

- [ ] weight resolves.
- [ ] anvil resolves.
- [ ] coil resolves.
- [ ] prism resolves.
- [ ] spring resolves.
- [ ] wire resolves.
- [ ] reso resolves.
- [ ] fork resolves.
- [ ] gate resolves.
- [ ] bell resolves.
- [ ] marble resolves.
- [ ] Jam icon resolves.
- [ ] Blueprint icon resolves.
- [ ] Assets remain crisp/pixelated when scaled.

## Animation

- [ ] Marble visually moves cell-to-cell.
- [ ] Weight activation is readable.
- [ ] Anvil impact is localized.
- [ ] Coil pulse is readable.
- [ ] Prism visibly explains the second marble.
- [ ] Spring visually explains the upward bounce.
- [ ] Wire effect is subtle.
- [ ] Resonator pulses once.
- [ ] Fork vibrates briefly.
- [ ] Gate has distinct pass/fail feedback.
- [ ] Bell visually connects ring → bonus marble.
- [ ] Score pop does not obscure playback.
- [ ] Jam intro happens once.
- [ ] No distracting idle animation loops.
- [ ] Reduced motion is respected.

## Audio

- [ ] Existing audio engine is preserved.
- [ ] Missing WAV files do not break gameplay.
- [ ] Mute still works.
- [ ] Visuals work without sound.

## Responsive

- [ ] 1280×800 desktop visually resembles the reference.
- [ ] ~375px mobile remains playable.
- [ ] All 5 board columns remain visible on mobile.
- [ ] No page-level horizontal overflow.
- [ ] Draft remains usable.
- [ ] Touch targets remain usable.

## Accessibility

- [ ] Keyboard interaction still works.
- [ ] Existing ARIA semantics are preserved.
- [ ] Focus is visible.
- [ ] Contrast remains readable.
- [ ] Existing accessibility tests pass.

## Skins

- [ ] `DEFAULT_GAME_SKIN` is `"pixel"`.
- [ ] Classic remains selectable.
- [ ] Classic still renders correctly.

## Final validation

- [ ] Build passes.
- [ ] Existing tests pass.
- [ ] Pixel was visually inspected at desktop size.
- [ ] Pixel was visually inspected at mobile size.
- [ ] One visual refinement pass was made after comparison with the reference.
