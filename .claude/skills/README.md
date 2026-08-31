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
[create-design-md](create-design-md/SKILL.md)

Accessibility: [fixing-accessibility](fixing-accessibility/SKILL.md),
[frontend-a11y](frontend-a11y/SKILL.md)

Performance and polish:
[fixing-motion-performance](fixing-motion-performance/SKILL.md), which is the
animation-heavy one that most applies to Payload's drop cascade, and
[fixing-metadata](fixing-metadata/SKILL.md)

Testing: [tdd-workflow](tdd-workflow/SKILL.md),
[e2e-testing](e2e-testing/SKILL.md), [react-testing](react-testing/SKILL.md)


React and Next.js: [react-patterns](react-patterns/SKILL.md),
[react-performance](react-performance/SKILL.md),
[frontend-patterns](frontend-patterns/SKILL.md)

### Notes on fit

This section used to say the games were vanilla single-file HTML with no
framework, no build and no tests. That stopped being true when Payload was ported
to React and TypeScript, and the triage in #12 was written against the old repo.
Re-derived against what is actually here, three of its eight removals reversed.

Removed, because they still cannot fire:

- `security-review` covers SQL injection, JWT, CSRF, RLS and Supabase. There is
  still no backend, no auth, no secrets and no network call in this repo.
- `ui-skills-root` routes UI work to the `ui-skills` CLI, which is not installed
  on this machine and is not in the global npm root. A router pointing at a
  missing tool is worse than no router.
- `frontend-design-direction` sets direction for websites, dashboards and landing
  pages. The direction here is settled elsewhere and in more detail:
  `tailwind.config.js` for tokens, [ADR-001](../../docs/adr/0001-styling.md) for
  the dialect, and `game-typography` for type.

Kept, because the reason to remove them has expired:

- `design-system` was cut for auditing a design system that did not exist. One
  exists now: four surface tiers, an eight-role type scale, and a test that fails
  the build if a contrast floor drops. Its visual-audit mode scores the exact
  dimensions that work was judged on.
- `frontend-a11y` was cut as framework-wrong React JSX accessibility. The app is
  React 19. It and `fixing-accessibility` now split cleanly: JSX for `src/ui`,
  HTML and ARIA for the hand-authored `public/index.html` and `public/ledger.html`.
- `e2e-testing` was cut for describing Playwright config in a repo with no
  `package.json`. There is one, plus 117 Vitest tests. No Playwright yet, so it is
  dormant rather than dead, and this session hit real limits in the browser pane
  that a real E2E runner would not have: synthetic Tab does not move focus, and
  CDP viewport emulation fires neither a resize nor a media-query change event.

`react-performance` and `frontend-patterns` stay on the borderline. Both are
framework-correct now and both are shaped around Next.js: `react-performance` is
585 lines organised around Server Components, Suspense streaming and route-level
splitting, for an SPA whose actual performance question is re-render count across
30 memoised cells. Kept, but they are the next candidates if the wrong skill
starts firing.

Payload is React 19 with a Vite build and a pure rules engine in `src/game/`, so
`react-patterns` and `react-testing` apply directly now rather than being carried
for a future rewrite. Ledger Lane is still one self-contained HTML file with no
tests; its `computePath`, `scorePath` and `solve` are the obvious first candidates
if that changes.

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

`ui-ux-pro-max` is worth keeping, against the recommendation in #12 to drop it as
a design-system generator for an aesthetic that is already settled. Its
`--design-system` mode is indeed wrong for this repo and produced a SaaS
operations palette with a Fira pairing when asked. Its `--domain` searches are
not: they are what surfaced the thirteen emoji still being used as interface
icons, the absence of hover feedback on a build that had just grown a desktop
layout, and the guidance that made the reflow failure at 200% text findable. Use
the domain searches and the pre-delivery checklist in `references/pro-rules.md`;
ignore the generator.

It needs Python, which is easy to miss because the failure is silent. Without an
interpreter the search script prints the Windows Store stub message and the skill
looks like it simply returned nothing.

Permissions were re-scoped as well. The Ticketmaster allowlist is shaped around
its own npm, vitest and netlify commands, so this repo carries its own: read-only
git plus `gh-axi`.
