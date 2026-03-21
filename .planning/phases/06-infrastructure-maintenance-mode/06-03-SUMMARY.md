---
phase: 06-infrastructure-maintenance-mode
plan: 03
subsystem: auth
tags: [fastapi, clerk, jwt, sqlalchemy, asyncpg, neon, postgresql]

# Dependency graph
requires:
  - phase: 06-02
    provides: FastAPI scaffold with health endpoint, uv environment, Dockerfile
provides:
  - Clerk JWT verification dependency for FastAPI routes (ClerkHTTPBearer guard)
  - Async SQLAlchemy engine connected to Neon PostgreSQL (NullPool for PgBouncer)
  - Read-only SQLAlchemy models mirroring sessions/chunks/notes/admins/subscriptions
  - GET /auth/me temporary verification endpoint
  - Health endpoint upgraded to async SQLAlchemy DB check
affects: [phase-09-meeting-agent, phase-07-scribe, phase-08-openrouter]

# Tech tracking
tech-stack:
  added: [fastapi-clerk-auth==0.0.9, pyjwt==2.12.1, cryptography==46.0.5]
  patterns:
    - "ClerkHTTPBearer lazily instantiated as module-level singleton via get_clerk_guard()"
    - "Annotated[dict, Depends(get_current_user)] pattern for all protected routes"
    - "NullPool + asyncpg for Neon PgBouncer compatibility"
    - "SQLAlchemy Enum(create_type=False) to reference existing Drizzle-created enums"
    - "postgres:// -> postgresql+asyncpg:// URL rewrite in _build_database_url()"

key-files:
  created:
    - backend/app/auth.py
    - backend/app/models/database.py
    - backend/app/models/tables.py
  modified:
    - backend/app/config.py
    - backend/app/routers/health.py
    - backend/app/main.py
    - backend/pyproject.toml
    - backend/uv.lock

key-decisions:
  - "fastapi-clerk-auth over manual PyJWT JWKS — library handles key caching and JWT verification cleanly"
  - "CLERK_FRONTEND_API_URL as explicit env var (preferred) with NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY as fallback via base64 decode"
  - "Missing Clerk config raises HTTP 503 (not 500) — operator misconfiguration is distinct from runtime auth failure"
  - "Enum values use actual Icelandic characters from migrations (viðtal, frjálst, stjórnarfundur, lokið) not ASCII approximations"
  - "dispose_engine() called on lifespan shutdown — prevents connection leaks when Railway redeploys"

patterns-established:
  - "Auth guard pattern: get_clerk_guard() as dependency factory, get_current_user() as route-level dependency"
  - "DB URL normalization: always run through _build_database_url() before passing to create_async_engine"
  - "Read-only SQLAlchemy models: extend_existing=True, no session.add/delete anywhere in backend/"

requirements-completed: [INFRA-03, INFRA-04]

# Metrics
duration: 3min
completed: 2026-03-21
---

# Phase 6 Plan 3: Clerk JWT Auth + Neon DB Layer Summary

**Clerk JWT verification (fastapi-clerk-auth) and async SQLAlchemy ORM layer connecting FastAPI to the shared Neon PostgreSQL database via asyncpg with NullPool**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-21T21:14:53Z
- **Completed:** 2026-03-21T21:17:57Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

- `backend/app/auth.py` — Clerk JWT guard that derives JWKS URL from env vars, with graceful 503 when unconfigured
- `backend/app/models/database.py` — Async SQLAlchemy engine with NullPool (PgBouncer-safe) and `get_db` dependency
- `backend/app/models/tables.py` — Read-only mirrors of 5 tables (sessions, chunks, notes, admins, subscriptions) with correct Icelandic enum values from DB migrations
- Health endpoint upgraded from sync psycopg2 to async SQLAlchemy `SELECT 1`
- `/auth/me` endpoint added for end-to-end JWT verification in Phase 6

## Task Commits

1. **Task 1: Add Clerk JWT auth dependency and SQLAlchemy database layer** - `2ae34ce` (feat)
2. **Task 2: Add /auth/me endpoint and update health check with async DB query** - `1b4fe44` (feat)

## Files Created/Modified

- `backend/app/auth.py` — ClerkHTTPBearer guard, get_current_user FastAPI dependency
- `backend/app/models/database.py` — create_async_engine, async_sessionmaker, get_db generator, dispose_engine
- `backend/app/models/tables.py` — DeclarativeBase, SessionModel, ChunkModel, NoteModel, AdminModel, SubscriptionModel
- `backend/app/config.py` — Added CLERK_FRONTEND_API_URL and NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY settings
- `backend/app/routers/health.py` — Async SQLAlchemy DB check replacing sync psycopg2
- `backend/app/main.py` — Added /auth/me route, dispose_engine on shutdown
- `backend/pyproject.toml` — Added fastapi-clerk-auth>=0.0.9

## Decisions Made

- Used `fastapi-clerk-auth` library over manual PyJWT JWKS implementation — handles key caching, JWT verification, and leeway automatically
- `CLERK_FRONTEND_API_URL` is the preferred env var; `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` supported as fallback (base64-decode the key to extract the frontend API domain)
- Missing Clerk config returns HTTP 503 "Auth not configured" rather than 500 — makes misconfiguration visible without leaking internal errors
- SQLAlchemy enum values use actual Icelandic characters from DB migrations (`viðtal`, `frjálst`, `stjórnarfundur`, `lokið`) — the plan interface section had ASCII approximations that don't match the real DB

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Converted ValueError to HTTP 503 when Clerk env vars are missing**
- **Found during:** Task 2 (server startup test)
- **Issue:** `get_clerk_guard()` raised unhandled `ValueError` when no Clerk env vars set, causing FastAPI to return HTTP 500
- **Fix:** Wrapped `_build_clerk_auth()` call in try/except in `get_clerk_guard()`, converts `ValueError` to `HTTPException(503)`
- **Files modified:** backend/app/auth.py
- **Verification:** `curl /auth/me` returns 503 locally with no env vars configured
- **Committed in:** `1b4fe44` (Task 2 commit)

**2. [Rule 1 - Bug] Corrected enum values to use Icelandic characters from actual migrations**
- **Found during:** Task 1 (reading Drizzle migrations)
- **Issue:** Plan interface section listed ASCII approximations (`vidtal`, `frjalst`, `stjornarfundur`, `lokid`) but DB migrations use Icelandic characters (`viðtal`, `frjálst`, `stjórnarfundur`, `lokið`)
- **Fix:** Used actual values from `drizzle/migrations/` SQL files
- **Files modified:** backend/app/models/tables.py
- **Verification:** Models load cleanly, enums reference correct DB type names
- **Committed in:** `2ae34ce` (Task 1 commit)

---

**Total deviations:** 2 auto-fixed (2 bugs)
**Impact on plan:** Both fixes necessary for correctness. No scope creep.

## Issues Encountered

None beyond the two auto-fixed bugs above.

## User Setup Required

Two new env vars must be added to Railway before Phase 6 verification:

- `CLERK_FRONTEND_API_URL` — e.g. `https://handy-parrot-42.clerk.accounts.dev` (from Clerk dashboard)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` — can use this as fallback if above is not set

Both variables are already in the production `.env` for the Next.js frontend; Railway needs them too.

## Next Phase Readiness

- FastAPI can authenticate Clerk JWTs from the Next.js frontend
- FastAPI can read from Neon DB using the shared `DATABASE_URL`
- All 5 Drizzle schema tables mirrored as read-only SQLAlchemy models
- Phase 6 plan 4 (CORS + Railway deploy verification) is ready to proceed
- Phase 9 (Meeting Agent) can import `get_current_user` and `get_db` directly

---
*Phase: 06-infrastructure-maintenance-mode*
*Completed: 2026-03-21*
