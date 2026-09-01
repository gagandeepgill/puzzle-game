# PAYLOAD Pixel UI — Start Here

This folder is the source of truth for implementing the **Simple Pixel** presentation of PAYLOAD.

## Read in this order

1. `CLAUDE_MASTER_PROMPT.md`
2. `REACT_COMPONENT_MAP.md`
3. `ANIMATION_SPEC.md`
4. `AUDIO_INTEGRATION.md`
5. `ASSET_PATHS.md`
6. `ACCEPTANCE_CHECKLIST.md`

Visual reference:

`/public/assets/pixel/hud-sources/reference/payload-ui-hud-asset-sheet.png`

## One-line instruction for Claude Code

> Read every file in `docs/pixel/` before editing. Use the reference image as the visual target, the current repo/game state as the gameplay source of truth, and implement the complete Pixel presentation without inventing mechanics. Finish a playable first pass, run tests/build, then do one visual refinement pass against the reference.

## Important

The Pixel skin is a **presentation redesign**, not a new game.

Preserve:
- game rules
- scoring
- 5×6 board
- exactly 3 draft offers
- Jams
- Blueprints
- current playback sequencing
- accessibility
- tests
- Classic skin

Do not block the UI implementation because WAV files are missing. The audio engine should fail gracefully until the assets are supplied.
