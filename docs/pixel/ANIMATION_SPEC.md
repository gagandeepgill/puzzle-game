# PAYLOAD Pixel UI — Animation Specification

Animations must follow existing gameplay playback events.

They should explain:
- marble travel
- part activation
- branching
- bonus marble creation
- scoring
- Jam introduction
- round/game result

Do not add constant idle animation.

## Timing constants

Use a central object:

```ts
export const PIXEL_MOTION = {
  ui: 120,
  marbleStep: 155,
  scorePop: 300,

  weight: 150,
  anvil: 220,
  coil: 180,
  prism: 260,
  spring: 260,
  wire: 110,
  reso: 300,
  fork: 300,
  gate: 220,
  bell: 350,

  jamIntro: 600,
  roundClear: 750,
  gameResult: 900,
} as const;
```

These are initial tuning values, not game rules.

## UI

Hover/select/press:
- 100–150ms
- tiny lift or scale only
- no repeated bouncing

## Marble

- animate cell-to-cell
- target ~155ms per step
- use actual playback path
- no fake physics simulation
- optional tiny trail only

## Weight

- short downward impact
- ~150ms
- tiny local hit effect

## Anvil

- heavier local impact
- ~220ms
- 1–2px localized shake
- never shake the full page

## Coil

- fast orange/electric pulse
- ~180ms
- scale/brightness pulse is sufficient if effects are limited

## Prism

Required readable sequence:

```text
marble arrives
→ Prism flashes
→ second marble appears
→ both routes continue
```

Target ~260ms for the activation beat.

## Spring

Strongest bounce.

Sequence:

```text
compress
→ release
→ marble moves upward
→ land
```

Target ~260ms.

## Wire

- subtle electric trace
- ~110ms
- keep quiet visually because it may trigger often

## Resonator

- one expanding pulse
- ~300ms
- no looping

## Tuning Fork

- small left/right vibration
- ~300ms
- one cyan pulse is acceptable

## Gate

Pass:
- gold/green flash/open feel

Fail:
- red/orange reject pulse

Target ~220ms.

Use actual pass/fail result.

## Bell

Required readable sequence:

```text
Bell activates
→ Bell rings
→ bonus marble appears
→ bonus marble continues
```

Target ~350ms.

## Score pop

- render near triggering cell
- rise ~8–14px
- fade
- ~300ms
- examples: +3, +8, ×2
- do not cover later playback

## Jam

- one warning intro
- ~600ms
- no permanent flashing/shaking

## Round Clear

- ~750ms
- larger but restrained temporary overlay

## Game Win / Game Over

- ~900ms
- strongest event-level presentation
- remain within the Simple Pixel visual language

## Reduced motion

Respect:

```css
@media (prefers-reduced-motion: reduce)
```

Reduce:
- shake
- bounce
- long travel flourishes

Keep:
- readable state transitions
- immediate placement/selection feedback

Reduced motion does not imply mute.

## Triggering

The same existing playback event should trigger:
- visual activation
- score feedback
- corresponding sound if available

Do not create a parallel simulation just for animation.
