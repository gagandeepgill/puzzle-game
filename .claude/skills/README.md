# Skills

Agent skills for this repo. Claude Code loads these automatically; each one is a
`SKILL.md` whose `description` decides when it triggers.

## Written for this repo

| Skill | Use it when |
|---|---|
| [verify-puzzle-game](verify-puzzle-game/SKILL.md) | Running, previewing, screenshotting or verifying a game. There is no build step or dev server; this covers browser-pane testing, bot-played balance runs, mobile checks, and the scratchpad→`demo/`→artifact path. |
| [payload-engine](payload-engine/SKILL.md) | Touching Payload's simulation, parts, blueprints, jams, difficulties or quotas — the architecture map plus the invariants that keep runs deterministic and fair. |
| [daily-seeded-runs](daily-seeded-runs/SKILL.md) | Anything about daily puzzles: UTC date keys, deterministic seeding, rotating variants, streaks, share payloads. |

## Shared, from `ticket-master-app`

Portable web-craft skills, copied unchanged so improvements can be diffed against their
source.

**UI and design** — [baseline-ui](baseline-ui/SKILL.md),
[improve-ui](improve-ui/SKILL.md), [design-system](design-system/SKILL.md),
[create-design-md](create-design-md/SKILL.md),
[frontend-design-direction](frontend-design-direction/SKILL.md),
[ui-skills-root](ui-skills-root/SKILL.md)

**Accessibility** — [fixing-accessibility](fixing-accessibility/SKILL.md),
[frontend-a11y](frontend-a11y/SKILL.md)

**Performance and polish** —
[fixing-motion-performance](fixing-motion-performance/SKILL.md) (the animation-heavy one
that most applies to Payload's drop cascade),
[fixing-metadata](fixing-metadata/SKILL.md)

**Testing** — [tdd-workflow](tdd-workflow/SKILL.md),
[e2e-testing](e2e-testing/SKILL.md), [react-testing](react-testing/SKILL.md)

**Security** — [security-review](security-review/SKILL.md)

**React / Next.js** — [react-patterns](react-patterns/SKILL.md),
[react-performance](react-performance/SKILL.md),
[frontend-patterns](frontend-patterns/SKILL.md)

### Notes on fit

The games here are vanilla single-file HTML — no framework, no build, no backend. The
React/Next skills are therefore **dormant today**; they are carried because
[`MASTER_PROMPT.md`](../../MASTER_PROMPT.md) specs Ledger Lane as a React Native app
with Zustand and TanStack Query, and `react-patterns` (hooks discipline, state
decisions) and `react-testing` transfer to that work. `frontend-patterns` and
`react-performance` are Next.js-specific and will not apply unless a web app appears.

Likewise the testing skills describe a Vitest/Jest/Playwright setup this repo does not
have yet. The pure functions in both games — `computePath`, `scorePath`, `solve`,
`runMarble`'s part maths — are the obvious first candidates if tests get added.

Two Ticketmaster skills were deliberately **not** copied because they encode that app's
infrastructure and would give wrong instructions here: `backend-work` (Netlify Functions
and Blobs — this repo has no backend) and `verify-ticket-app` (its dev server and
flows), which `verify-puzzle-game` replaces.

`pet-pals-app` has no skills directory, so nothing was taken from it.

## Plugins

Plugin marketplaces and the enabled set live in [`../settings.json`](../settings.json),
ported from `ticket-master-app` (pet-pals has no plugin config): 9 marketplaces and 12
plugins covering design, engineering, modern web guidance, PR review, security, and
several UI/design-audit packs.

Two things from that config were deliberately left out:

- **`netlify-skills`** — this repo has no backend and nothing to deploy to Netlify. Add
  it back if the arcade is ever hosted there.
- **The `SessionStart` hook** — it compares `origin/main` against `origin/production` to
  nag about promoting. This repo has no `production` branch, so the hook would either
  no-op or print misleading advice on every session start.

Permissions were re-scoped too: the Ticketmaster allowlist is npm/vitest/netlify-shaped,
none of which exists here, so this repo allows read-only git plus `gh-axi`.
