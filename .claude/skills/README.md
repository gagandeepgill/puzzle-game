# Skills

Agent skills for this repo. Claude Code loads these automatically; each one is a
`SKILL.md` whose `description` decides when it triggers.

## Written for this repo

| Skill | Use it when |
|---|---|
| [verify-puzzle-game](verify-puzzle-game/SKILL.md) | Running, previewing, screenshotting or verifying a game. Covers which parts build and which are single files, browser-pane testing, bot-played balance runs, and clearing the service worker that otherwise hands back a stale build. |
| [payload-engine](payload-engine/SKILL.md) | Touching Payload's simulation, parts, blueprints, jams, difficulties or quotas. The architecture map, plus the invariants that keep runs deterministic and fair. |
| [daily-seeded-runs](daily-seeded-runs/SKILL.md) | Anything about daily puzzles: UTC date keys, deterministic seeding, rotating variants, streaks, share payloads. |
| [puzzle-design](puzzle-design/SKILL.md) | Adding a part, tuning a quota curve, designing a boss twist, or judging whether a proposed mechanic is fun. |
| [game-feel](game-feel/SKILL.md) | Adding or tuning animation, sound or score presentation, or when a moment that should feel good does not. |
| [game-typography](game-typography/SKILL.md) | Adding or restyling text, numbers, labels or buttons, and the contrast floors that set the sizing. |
| [typescript-game-state](typescript-game-state/SKILL.md) | Writing or changing the types: discriminated phases, branded ids, exhaustive part handling, keeping the engine free of any renderer. |

## Shared, from `ticket-master-app`

Portable web-craft skills, copied unchanged so improvements can be diffed against
their source.

UI and design: [baseline-ui](baseline-ui/SKILL.md),
[improve-ui](improve-ui/SKILL.md), [design-system](design-system/SKILL.md),
[create-design-md](create-design-md/SKILL.md),
[frontend-design-direction](frontend-design-direction/SKILL.md),
[ui-skills-root](ui-skills-root/SKILL.md)

Accessibility: [fixing-accessibility](fixing-accessibility/SKILL.md),
[frontend-a11y](frontend-a11y/SKILL.md)

Performance and polish:
[fixing-motion-performance](fixing-motion-performance/SKILL.md), which is the
animation-heavy one that most applies to Payload's drop cascade, and
[fixing-metadata](fixing-metadata/SKILL.md)

Testing: [tdd-workflow](tdd-workflow/SKILL.md),
[e2e-testing](e2e-testing/SKILL.md), [react-testing](react-testing/SKILL.md)

Security: [security-review](security-review/SKILL.md)

React and Next.js: [react-patterns](react-patterns/SKILL.md),
[react-performance](react-performance/SKILL.md),
[frontend-patterns](frontend-patterns/SKILL.md)

### Notes on fit

This section used to say the games were vanilla single-file HTML with no
framework, no build and no tests. That stopped being true when Payload was ported
to React and TypeScript.

Payload is React 19 with a Vite build and a pure rules engine in `src/game/`, so
`react-patterns` and `react-testing` apply directly now rather than being carried
for a future rewrite. `react-performance` and `frontend-patterns` are Next.js
specific and still do not apply, since there is no Next.js target and
[ADR-001](../../docs/adr/0001-styling.md) has not chosen one.

The testing skills describe a Vitest setup the repo now has. Ledger Lane is still
one self-contained HTML file with no tests; its `computePath`, `scorePath` and
`solve` are the obvious first candidates if that changes.

Two Ticketmaster skills were deliberately not copied, because they encode that
app's infrastructure and would give wrong instructions here: `backend-work`, which
is about Netlify Functions and Blobs that this repo does not use, and
`verify-ticket-app`, which `verify-puzzle-game` replaces.

`pet-pals-app` has no skills directory, so nothing was taken from it.

## Plugins

Plugin marketplaces and the enabled set live in
[`../settings.json`](../settings.json), ported from `ticket-master-app`, since
pet-pals has no plugin config. Twelve marketplaces and twelve plugins covering
design, engineering, modern web guidance, PR review, security, and several
UI and design-audit packs.

One thing from that config was deliberately left out. The `SessionStart` hook
compares `origin/main` against `origin/production` to nag about promoting. This
repo has no `production` branch, so the hook would either no-op or print
misleading advice at every session start.

`netlify-skills` was also left out originally, on the grounds that there was
nothing to deploy to Netlify. The arcade is hosted there now, so that reasoning
no longer holds. Whether to add it is open, and tracked in #12.

Permissions were re-scoped as well. The Ticketmaster allowlist is shaped around
its own npm, vitest and netlify commands, so this repo carries its own: read-only
git plus `gh-axi`.
