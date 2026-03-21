---
phase: 06-infrastructure-maintenance-mode
plan: 01
subsystem: infra
tags: [middleware, maintenance-mode, clerk, neon, edge-runtime, next-intl]

requires: []

provides:
  - "MAINTENANCE_MODE env var toggle that rewrites all non-API, non-admin traffic to /maintenance"
  - "app/maintenance/page.tsx — dark-theme Icelandic glowup page with indigo-500 accents"
  - "Admin bypass via DB check against admins table (neon HTTP, edge-safe)"

affects:
  - 07-elevenlabs-scribe-stt
  - 08-openrouter-llm-routing
  - 09-meeting-agent-fastapi

tech-stack:
  added: []
  patterns:
    - "Maintenance guard at top of clerkMiddleware before auth.protect() and i18n routing"
    - "Edge-safe DB query via neon() raw SQL (not Drizzle) for admin check in middleware"
    - "Standalone maintenance page outside [locale] folder — no layout, no auth wrappers"

key-files:
  created:
    - app/maintenance/page.tsx
  modified:
    - proxy.ts

key-decisions:
  - "Admin bypass uses neon() raw SQL in Edge middleware — avoids Drizzle overhead, still edge-safe via fetch"
  - "Fail closed on DB error during maintenance — if admin check throws, deny bypass (not silently grant)"
  - "Maintenance page is outside [locale] — served via rewrite to /maintenance, no locale prefix needed"
  - "API routes (/api/*) are unconditionally skipped — webhooks, cron, and health are never blocked"

patterns-established:
  - "Maintenance guard: check env var first, skip API + /maintenance path, then DB-check admin, then rewrite"

requirements-completed:
  - INFRA-01

duration: 6min
completed: 2026-03-21
---

# Phase 6 Plan 01: Maintenance Mode Summary

**Env-var-toggled maintenance gate in Next.js Edge middleware — rewrites non-admin traffic to a dark-theme Icelandic glowup page, leaving all API routes unblocked**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-21T21:10:40Z
- **Completed:** 2026-03-21T21:16:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments
- Maintenance mode check inserted at the top of `clerkMiddleware` — activates when `MAINTENANCE_MODE=true`
- API routes (/api/*) are unconditionally excluded — webhooks, cron, and health keep working
- Admin users bypass via edge-safe Neon HTTP SQL query against the `admins` table
- Static `/maintenance` page with zinc-950 background, pulsing indigo dots, and Icelandic message

## Task Commits

Each task was committed atomically:

1. **Task 1: Add maintenance mode check + create maintenance page** - `381f484` (feat)

**Plan metadata:** _(docs commit follows)_

## Files Created/Modified
- `proxy.ts` — maintenance guard inserted before auth.protect() and i18n routing
- `app/maintenance/page.tsx` — standalone dark-theme maintenance page (no locale, no layout)

## Decisions Made
- Used `neon()` raw SQL directly (not Drizzle) for the admin check in Edge middleware — avoids the full Drizzle client overhead while staying edge-safe via fetch
- Fail closed on DB error: if the admin check throws, the user does NOT get admin bypass — safer than silently granting access during partial outages
- Admin check only runs when `MAINTENANCE_MODE=true` AND user is not hitting `/api/*` — no DB overhead in normal operation

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
To enable maintenance mode:
1. Set `MAINTENANCE_MODE=true` in Vercel environment variables (or `.env.local` for local dev)
2. Redeploy is NOT required — Vercel edge middleware re-reads env vars at request time

To disable: remove or set to any value other than `"true"` (e.g. `"false"` or delete it).

## Next Phase Readiness
- Maintenance mode is live and deployable — safe rollback mechanism for all subsequent phases
- Phase 7 (ElevenLabs Scribe STT layer) can begin; maintenance mode can be enabled during database migrations

---
*Phase: 06-infrastructure-maintenance-mode*
*Completed: 2026-03-21*
