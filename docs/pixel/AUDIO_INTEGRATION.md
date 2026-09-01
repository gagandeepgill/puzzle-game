# PAYLOAD Pixel UI — Audio Integration

The UI implementation must not wait for WAV files.

Use the existing audio architecture in `src/ui/audio.ts`.

Do not create a second unrelated audio engine.

Expected root:

```text
public/assets/audio/pixel/
```

Expected files:

```text
gameplay/
  marble-drop.wav
  marble-move.wav
  marble-land.wav
  score-small.wav
  score-medium.wav
  score-big.wav
  quota-clear.wav

parts/
  weight.wav
  anvil.wav
  coil.wav
  prism.wav
  spring.wav
  wire.wav
  reso.wav
  fork.wav
  gate-pass.wav
  gate-fail.wav
  bell.wav

ui/
  hover.wav
  click.wav
  select.wav
  place.wav
  draft-open.wav
  blueprint.wav
  error.wav

events/
  jam-warning.wav
  round-start.wav
  round-clear.wav
  game-win.wav
  game-over.wav
```

## Behavior

- cache/preload common sounds
- do not fetch on every activation
- use the existing mute control
- do not autoplay before user interaction
- missing files must fail gracefully
- audio must never break gameplay
- visual feedback remains independent

## Volume hierarchy

Start approximately:

```ts
export const PIXEL_VOLUME = {
  hover: 0.18,
  ui: 0.30,
  marble: 0.40,
  wire: 0.42,
  part: 0.55,
  anvil: 0.60,
  scoreSmall: 0.32,
  scoreMedium: 0.42,
  scoreBig: 0.52,
  jam: 0.62,
  event: 0.68,
  roundClear: 0.72,
  win: 0.78,
  gameOver: 0.68,
} as const;
```

UI < Marble < Normal parts < Big part/score < Jam/quota < Round clear < Win

## Pitch variation

Optional for common repeated sounds:

```ts
0.96 + Math.random() * 0.08
```

Do not randomize:
- Jam warning
- quota clear
- round clear
- game win
- game over

## Important sequences

Prism:

```text
arrival
→ prism sound
→ split
→ second marble
```

Bell:

```text
bell strike
→ bonus marble appears
→ echo
```

Spring:

```text
compress/click
→ rising boing
→ marble travels upward
```

Anvil:

```text
impact
→ tiny pause
→ marble shift
```

Gate:
- distinct pass sound
- distinct fail sound

## Cue length

Several cues run longer than the event that triggers them. A marble steps
every 155ms and `parts/anvil.wav` is 810ms, `parts/bell.wav` 974ms,
`parts/coil.wav` 636ms and `parts/wire.wav` 420ms. That was raised as a
defect and measured out as not being one; the measurements are here so it does
not get re-raised.

**Nothing is padded.** No cue in the pack has leading or trailing silence
above -45dB, so there is no length to reclaim without cutting sound.

**The long ones are content, not tail.** Wire is the shortest of them and the
one that fires most often, once per part a marble has already touched. Its
envelope stays within 6dB of peak for 240ms of its 420ms and only then decays.
Truncating it to a step would remove the sound rather than trim it, and a bell
cut to 155ms is a bell with its decay clipped off.

**The layering is already bounded.** `sampleBank.ts` caps concurrent voices at
three per cue and drops the fourth, and a major activation ducks the movement
cues to 45% for a moment. A wire chain therefore plays at most three
overlapping wires, which is what that cap is for.

Two cues are shorter than their event rather than longer: `events/jam-warning`
is 70ms and `events/game-over` 142ms, the latter ending before the result
modal opens. Neither can be fixed by editing the file — they would have to be
re-recorded, and that is a judgement about how a run should end rather than a
defect.

## Synchronization

Aim for sound and visible activation within roughly 20–40ms.

Do not make every sound fire at once when playback is sequential.
