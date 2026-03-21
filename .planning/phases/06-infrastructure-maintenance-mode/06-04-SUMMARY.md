---
phase: 06-infrastructure-maintenance-mode
plan: 04
subsystem: infra
tags: [cors, dns, railway, fastapi, subdomain, custom-domain]

# Dependency graph
requires:
  - phase: 06-02
    provides: FastAPI backend running on Railway with health endpoint
provides:
  - CORS middleware configured with strict env-var-driven origins
  - api.handriti.is custom domain routing to Railway FastAPI service
  - Production cross-origin connectivity between handriti.is (Vercel) and api.handriti.is (Railway)
affects: [07-scribe-stt, 08-openrouter-llm, 09-meeting-agent, all phases that make cross-origin requests]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "CORS origins driven by CORS_ORIGINS env var (comma-separated) — no hardcoded origins"
    - "localhost:3000 only included in CORS when explicitly set via env var (never hardcoded)"
    - "DNS subdomain split: api.handriti.is → Railway, handriti.is → Vercel"

key-files:
  created: []
  modified:
    - backend/app/main.py

key-decisions:
  - "CORS_ORIGINS env var is the single source of truth for allowed origins — dev adds localhost via env, not code"
  - "api.handriti.is CNAME points to nmlzr64m.up.railway.app (Railway provided hostname)"
  - "SSL cert still provisioning at completion time — DNS resolves correctly, cert expected within minutes"

patterns-established:
  - "Environment-driven CORS: all origin changes go through env vars, not code deploys"

requirements-completed: [INFRA-05]

# Metrics
duration: ~45min
completed: 2026-03-21
---

# Phase 6 Plan 04: Subdomain Routing + CORS Summary

**CORS middleware locked to env-var-driven strict origins, CNAME api.handriti.is → Railway configured at isnic.is, cross-origin routing between Vercel frontend and Railway backend established**

## Performance

- **Duration:** ~45 min
- **Started:** 2026-03-21
- **Completed:** 2026-03-21
- **Tasks:** 2
- **Files modified:** 1

## Accomplishments

- CORS middleware in `backend/app/main.py` updated to production-ready strict origin configuration driven by `CORS_ORIGINS` env var
- `allow_credentials=True` and full method/header coverage for auth header passthrough
- User configured CNAME record `api.handriti.is → nmlzr64m.up.railway.app` at isnic.is
- Railway custom domain `api.handriti.is` added to backend service
- DNS resolves correctly; SSL cert provisioning in progress (Railway auto-provisions)

## Task Commits

Each task was committed atomically:

1. **Task 1: Configure CORS middleware with strict production origins** - `f55e0aa` (feat)
2. **Task 2: Configure DNS and Railway custom domain for api.handriti.is** - human action (no commit)

**Plan metadata:** (docs commit — this summary)

## Files Created/Modified

- `backend/app/main.py` - CORSMiddleware using `CORS_ORIGINS` env var, allow_credentials=True, strict origins

## Decisions Made

- CORS origins are entirely env-var-driven: `CORS_ORIGINS=https://handriti.is` in production, `CORS_ORIGINS=https://handriti.is,http://localhost:3000` for dev. No defaults include localhost.
- SSL cert was still provisioning at plan completion — DNS routing is functional, cert will complete automatically via Railway's Let's Encrypt provisioning.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- SSL certificate still provisioning at completion time. This is expected Railway behavior (Let's Encrypt provisioning takes a few minutes after CNAME propagation). Not a blocker — DNS resolves correctly and cert will complete automatically.

## User Setup Required

User manually completed the following:
1. Railway Dashboard: Added custom domain `api.handriti.is` to backend service — Railway provided CNAME target `nmlzr64m.up.railway.app`
2. isnic.is DNS: Added CNAME record `api` → `nmlzr64m.up.railway.app`, TTL 3600
3. DNS propagation confirmed — route resolves

## Next Phase Readiness

- Cross-origin routing foundation is in place — all subsequent phases (Scribe STT, OpenRouter LLM, Meeting Agent) can make requests from `handriti.is` to `api.handriti.is` without CORS errors
- SSL cert needs to finish provisioning before HTTPS requests succeed end-to-end (expected: minutes after DNS propagation)
- Phase 6 is now complete (4/4 plans) — infrastructure and maintenance mode baseline is established for safe v2 migration

---
*Phase: 06-infrastructure-maintenance-mode*
*Completed: 2026-03-21*
