---
name: game-typography
description: 'The arcade''s type system — the Fraunces/Outfit pairing, the roles each face plays, the numeric styling that game UI lives on, and the sizing floor set by measured contrast headroom. Use when adding or restyling any text, number, label or button in Payload, Ledger Lane or the hub, when choosing a size or weight, or when text feels cramped, illegible or off-brand.'
---

# Type in the arcade

Two faces, loaded from Google Fonts, with strictly separate jobs. Keep them separate —
mixing the roles is what makes a game UI read as generic.

| Face | Role | Where |
|---|---|---|
| **Fraunces** (serif, 500/650/700) | Identity and *result* numbers. Anything the player should feel. | Wordmark, game titles, modal headline, big stat values, quota, rank titles |
| **Outfit** (sans, 400–700) | Everything operational. Anything the player should read. | Body copy, part rules, labels, buttons, banners, HUD text |

Fallbacks are declared and must stay: `'Fraunces', Georgia, serif` and
`'Outfit', 'Segoe UI', system-ui, sans-serif`. Google Fonts is the only external host
the CSP allows, and the service worker caches both — a face added from anywhere else
silently falls back.

## Numbers are the game

Payload is a game about numbers changing. Every digit that updates in place or sits in
a column **must** use `font-variant-numeric: tabular-nums`, or the layout twitches on
every drop. Already applied to the score, quota, drop ticker, stat tiles, taps and
totals — do not add a new counter without it.

Reach for **Fraunces** when a number is a *result* the player earned (round score, the
quota they must beat, banked total, best drop). Reach for **Outfit** when it is
*operational state* (drops left, taps, part badges like `+3` and `×2`). This split is
what makes the modal's stat row feel like a payout and the HUD feel like instrumentation.

## The scale, and its floor

Sizes in use, smallest first: 9.5px (part badge `.mini`), 10px (stat caption), 10.5px
(gold badge), 11px (draft card rule), 12px (footer, chips), 12.5–13.5px (banners, body,
buttons), 14.5–15px (primary buttons), 17–21px (HUD values), 22–30px (headlines).

**The floor is set by contrast, not taste.** `--steel` on `--card` measures **4.91:1** —
only 0.41 above the 4.5:1 requirement. So:

- Never darken `--steel` or lighten `--card`.
- Text below ~12px must not use `--steel` on `--card`; use `--ink` (14.81:1) instead.
  The 9.5px `.mini` badges and 10px stat captions are the ones to watch.
- Anything genuinely secondary and tiny is better solved by *removing* it than by
  greying it further.

## Rules that keep it coherent

- **Uppercase labels get letter-spacing.** `.k`, `.tag`, `.demo-chip` and the perfect-day
  badge all use `letter-spacing: .06–.14em`. Uppercase without tracking looks broken.
- **Headlines get `line-height: 1.15`; body gets `1.5–1.6`.** The modal headline and
  wordmark are tight; banners and rules text are loose. Nothing sits between.
- **Never centre a paragraph.** Only single-line labels and stat tiles are centred.
- **Weight carries emphasis, not colour alone.** `<strong>` in banner copy switches to
  `--ink` *and* 600 — both, because colour alone fails for low-vision players.
- **Sentence case for copy, Title Case for names.** Part names ("Tuning Fork"), rank
  titles ("Master of the Ledger") and game names are Title Case; every sentence of
  explanation is sentence case.

## Known debt

Every size in all three files is `px`. Page zoom works, but a player who raises their
browser's *default font size* gets no scaling at all — verified: setting root
`font-size: 32px` changes nothing. Converting body copy to `rem` is the fix; the grid
and marble may stay `px` since they are a fixed-geometry play surface. Do this as a
deliberate pass, not opportunistically, so the scale stays consistent.
