---
phase: 06-infrastructure-maintenance-mode
verified: 2026-03-21T22:25:00Z
status: gaps_found
score: 10/13 must-haves verified
re_verification: true
  previous_status: gaps_found
  previous_score: 8/11
  gaps_closed:
    - "FastAPI app starts and responds to HTTP requests (Railway service now live)"
    - "GET /health returns 200 with version, uptime, timestamp, DB status (database:connected confirmed)"
    - "CORS headers allow cross-origin requests from handriti.is to api.handriti.is (confirmed in response)"
  gaps_remaining:
    - "api.handriti.is HTTPS fails (SSL cert still provisioning) — generated domain works, custom domain does not"
    - "Invalid/missing JWT returns 500 instead of 401/403 — auth dependency wiring bug in auth.py"
  regressions: []
gaps:
  - truth: "api.handriti.is routes to the Railway FastAPI service"
    status: partial
    reason: "DNS CNAME is correct (api.handriti.is → nmlzr64m.up.railway.app, confirmed by dig). HTTP returns 301 redirect to HTTPS. HTTPS fails with SSL error (exit code 60) — certificate still provisioning as noted in context. The generated domain https://handritib-production.up.railway.app works fully. This gap will self-resolve when Railway finishes SSL provisioning."
    artifacts: []
    missing:
      - "Wait for SSL certificate provisioning to complete on api.handriti.is (Railway provisions automatically, no action needed)"
  - truth: "An invalid or missing JWT is rejected with 401/403"
    status: failed
    reason: "GET /auth/me returns HTTP 500 Internal Server Error for both missing and malformed tokens. Root cause: auth dependency wiring bug. get_current_user uses Depends(get_clerk_guard) where get_clerk_guard() returns a ClerkHTTPBearer instance. FastAPI injects the ClerkHTTPBearer instance as 'credentials'. The code then tries dict(credentials) on a non-dict object (ClerkHTTPBearer has no .dict()), causing TypeError → 500. The fix is to restructure get_clerk_guard as a proper FastAPI dependency that returns JWT credentials, or use a module-level ClerkHTTPBearer instance directly in Depends()."
    artifacts:
      - path: "backend/app/auth.py"
        issue: "get_current_user depends on get_clerk_guard which returns ClerkHTTPBearer instance, not decoded JWT credentials. FastAPI injects the instance as credentials, causing dict() to fail with TypeError → 500."
    missing:
      - "Fix get_current_user to use a module-level ClerkHTTPBearer instance via Depends(), or make get_clerk_guard an async dependency that actually verifies the token and returns credentials dict"
human_verification:
  - test: "After SSL cert provisions: curl https://api.handriti.is/health"
    expected: "Returns 200 JSON with status, version, uptime_seconds, timestamp, database fields"
    why_human: "SSL cert provisioning is async; cannot predict exact completion time"
  - test: "Enable MAINTENANCE_MODE=true in .env.local, run npm run dev, visit localhost:3000 as a non-admin user"
    expected: "Maintenance page renders with dark zinc-950 background, pulsing indigo dots, Icelandic text 'Handriti er að fara í glowup', and subtitle"
    why_human: "Visual rendering and actual middleware execution require a running browser session"
  - test: "With MAINTENANCE_MODE=true, verify /api/health returns 200 (not rewritten)"
    expected: "API routes bypass maintenance — curl localhost:3000/api/health returns 200"
    why_human: "Requires running dev server"
  - test: "After auth.py fix is deployed: curl -H 'Authorization: Bearer invalidtoken' https://handritib-production.up.railway.app/auth/me"
    expected: "Returns HTTP 403 Forbidden (not 500 Internal Server Error)"
    why_human: "Requires a deployment to Railway after the code fix"
  - test: "After auth.py fix: get a valid Clerk JWT from the Next.js app and send it to /auth/me"
    expected: "Returns {user_id: 'user_...', claims: {...}} with HTTP 200"
    why_human: "Requires a real Clerk session token from a running browser session"
---

# Phase 6: Infrastructure + Maintenance Mode Verification Report

**Phase Goal:** Deploy maintenance mode page, scaffold FastAPI backend on Railway, establish shared auth (Clerk JWT) and DB (Neon) access, configure subdomain routing (api.handriti.is → Railway).
**Verified:** 2026-03-21T22:25:00Z
**Status:** gaps_found
**Re-verification:** Yes — after Railway deployment gap closure

---

## Re-Verification Summary

This is a re-verification following the initial verification (score: 8/11) where all 3 gaps were deploy-time issues. The Railway service is now live.

**Gaps closed (3):**
- FastAPI is running and responding on Railway generated domain
- Database connection confirmed (status: ok, database: connected)
- CORS headers confirmed in HTTP responses

**Gaps remaining (2):**
- api.handriti.is HTTPS unreachable (SSL cert still provisioning — self-resolving)
- Auth dependency wiring bug in auth.py causes 500 on /auth/me (NEW gap discovered via live testing)

---

## Goal Achievement

### Observable Truths

| #  | Truth | Status | Evidence |
|----|-------|--------|----------|
| 1  | MAINTENANCE_MODE=true shows maintenance page to non-admin visitors | ? HUMAN | proxy.ts lines 39-53: MAINTENANCE_MODE check, API bypass, admin bypass, NextResponse.rewrite — correct logic; requires running dev server |
| 2  | Admins bypass maintenance mode (DB check against admins table) | ? HUMAN | proxy.ts line 47-48: isAdminUser() queries neon() raw SQL against admins table — logic correct; requires running server |
| 3  | Unsetting MAINTENANCE_MODE restores app immediately | ? HUMAN | Guard checks `process.env.MAINTENANCE_MODE === 'true'` exactly — correct; Edge middleware re-reads env at request time |
| 4  | API routes are NOT blocked by maintenance mode | ? HUMAN | proxy.ts line 41-42: `pathname.startsWith('/api')` exits early before rewrite — correct logic; requires running server |
| 5  | FastAPI app starts and responds to HTTP requests | ✓ VERIFIED | `curl https://handritib-production.up.railway.app/health` → 200 JSON response |
| 6  | GET /health returns 200 with version, uptime, timestamp, DB status | ✓ VERIFIED | Response: `{"status":"ok","version":"0.1.0","uptime_seconds":42.7,"timestamp":"2026-03-21T22:19:47Z","database":"connected"}` |
| 7  | The project uses uv for dependency management | ✓ VERIFIED | backend/pyproject.toml + uv.lock confirmed |
| 8  | Ruff is configured for linting and formatting | ✓ VERIFIED | backend/ruff.toml with py312, line-length 100, E/F/I/UP/B/SIM rules |
| 9  | Dockerfile builds and runs correctly | ✓ VERIFIED | Multi-stage Dockerfile committed; Railway built and deployed successfully (service is live) |
| 10 | A Clerk-signed JWT from the Next.js frontend is accepted by FastAPI | ✗ FAILED | /auth/me returns 500 for all requests — auth dependency wiring bug in auth.py (see Gaps) |
| 11 | An invalid or missing JWT is rejected with 401/403 | ✗ FAILED | /auth/me returns HTTP 500 (not 401 or 403) — same root cause as truth #10 |
| 12 | FastAPI can read from Neon using shared DATABASE_URL | ✓ VERIFIED | /health returns `"database":"connected"` — confirms live DB connectivity on Railway |
| 13 | SQLAlchemy models mirror Drizzle schema read-only | ✓ VERIFIED | tables.py: 5 models, correct column names, Icelandic enum values, create_type=False |
| 14 | api.handriti.is routes to Railway FastAPI service | ✗ PARTIAL | DNS correct (CNAME → nmlzr64m.up.railway.app). HTTP 301 redirect works. HTTPS fails — SSL cert not yet provisioned. Generated domain works fully. |
| 15 | handriti.is routes to Vercel (unchanged) | ✓ VERIFIED | No changes made to Vercel routing |
| 16 | CORS headers allow requests from handriti.is to api.handriti.is | ✓ VERIFIED | Response headers confirmed: `access-control-allow-origin: https://handriti.is`, `access-control-allow-credentials: true`, methods and headers confirmed via OPTIONS preflight |

**Score:** 10/13 automated truths verified (2 failed, 1 partial, 3 need human verification)

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `proxy.ts` | Maintenance mode check before auth/i18n routing | ✓ VERIFIED | 73 lines; MAINTENANCE_MODE env var check at line 39; admin DB bypass via neon() raw SQL; API routes excluded |
| `app/maintenance/page.tsx` | Maintenance page with Icelandic message | ✓ VERIFIED | 142 lines; zinc-950 background; pulsing indigo dots; "Handriti er að fara í glowup"; responsive viewport |
| `backend/app/main.py` | FastAPI application entry point | ✓ VERIFIED | 56 lines; create_app() factory; CORSMiddleware with env-driven origins; health router; /auth/me endpoint; lifespan |
| `backend/app/routers/health.py` | Detailed health check endpoint | ✓ VERIFIED | 46 lines; async SQLAlchemy SELECT 1; returns status/version/uptime_seconds/timestamp/database |
| `backend/Dockerfile` | Docker build for Railway deployment | ✓ VERIFIED | Multi-stage; FROM python:3.12-slim; uvicorn CMD; HEALTHCHECK — deployed and running on Railway |
| `backend/pyproject.toml` | Python project config with uv + ruff | ✓ VERIFIED | fastapi, uvicorn, pydantic-settings, sqlalchemy, asyncpg, fastapi-clerk-auth all present |
| `backend/app/config.py` | Settings from env vars | ✓ VERIFIED | DATABASE_URL, CLERK_SECRET_KEY, CLERK_FRONTEND_API_URL, NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY, CORS_ORIGINS |
| `backend/app/auth.py` | Clerk JWT verification dependency | ✗ WIRED INCORRECTLY | 106 lines; ClerkHTTPBearer constructed correctly; but get_current_user dependency chain is broken — see Gaps |
| `backend/app/models/tables.py` | SQLAlchemy table mirrors | ✓ VERIFIED | 137 lines; 5 models (Session, Chunk, Note, Admin, Subscription); Icelandic enum values; create_type=False |
| `backend/app/models/database.py` | SQLAlchemy engine + session factory | ✓ VERIFIED | 87 lines; create_async_engine; NullPool; URL normalization postgres:// → postgresql+asyncpg://; get_db async generator; dispose_engine |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `proxy.ts` | `app/maintenance/page.tsx` | `NextResponse.rewrite('/maintenance')` | ✓ WIRED | Line 51: rewrite conditional on MAINTENANCE_MODE=true and non-admin non-API |
| `backend/app/main.py` | `backend/app/routers/health.py` | `app.include_router(health.router)` | ✓ WIRED | Line 39: include_router confirmed; /health responds live |
| `backend/Dockerfile` | `backend/app/main.py` | uvicorn entrypoint | ✓ WIRED | CMD: `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}` — confirmed running on Railway |
| `backend/app/auth.py` | Clerk JWKS endpoint | ClerkHTTPBearer with derived JWKS URL | ✗ BROKEN | ClerkHTTPBearer is constructed correctly and JWKS URL derivation is correct, BUT get_current_user dependency chain is wired incorrectly (see Gaps). /auth/me returns 500. |
| `backend/app/models/database.py` | Neon PostgreSQL | DATABASE_URL from settings | ✓ WIRED | Confirmed live: /health returns "database":"connected" from Railway |
| `backend/app/models/tables.py` | lib/db/schema.ts (mirror) | Manual mirror — same table names/columns | ✓ WIRED | tables.py references sessions, chunks, notes, admins, subscriptions — matches Drizzle schema |
| `handriti.is (browser)` | `api.handriti.is (Railway)` | CORS-allowed cross-origin fetch | ✗ PARTIAL | CORS headers confirmed on generated domain. Custom domain api.handriti.is SSL not yet provisioned (cert pending). Will work once SSL provisions. |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| INFRA-01 | 06-01-PLAN.md | Maintenance mode toggleable via env var | ✓ SATISFIED | proxy.ts + app/maintenance/page.tsx complete and wired; logic verified |
| INFRA-02 | 06-02-PLAN.md | FastAPI backend deployed on Railway with health check | ✓ SATISFIED | Service live: https://handritib-production.up.railway.app/health returns 200 with database:connected |
| INFRA-03 | 06-03-PLAN.md | Clerk JWT verification working on FastAPI backend | ✗ BLOCKED | auth.py has ClerkHTTPBearer configured correctly, but get_current_user dependency chain is wired incorrectly — /auth/me returns 500 for all requests |
| INFRA-04 | 06-03-PLAN.md | Neon DB accessible from both Vercel and Railway | ✓ SATISFIED | DATABASE_URL configured on Railway; /health returns "database":"connected"; SQLAlchemy engine confirmed live |
| INFRA-05 | 06-04-PLAN.md | Subdomain routing — api.handriti.is → Railway | ✗ PARTIAL | DNS CNAME correct; HTTP 301 works; HTTPS fails (SSL cert provisioning). Self-resolving when cert provisions. |

All 5 INFRA requirements are claimed by plans and appear in REQUIREMENTS.md. No orphaned requirements.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `backend/app/main.py` | 41-50 | `# TEMPORARY — for Phase 6 verification only` on /auth/me endpoint | ℹ️ Info | Intentional placeholder; plan explicitly marks it temporary |
| `backend/app/auth.py` | 73-105 | get_current_user uses `Depends(get_clerk_guard)` where get_clerk_guard returns a ClerkHTTPBearer instance — FastAPI injects the instance as `credentials`, then `dict(credentials)` throws TypeError | 🛑 Blocker | Prevents INFRA-03 from working; /auth/me returns 500 for all requests including missing/invalid tokens |

---

## Human Verification Required

### 1. Maintenance Mode Visual + Functional Test

**Test:** Set `MAINTENANCE_MODE=true` in `.env.local`, run `npm run dev`, open `http://localhost:3000` in a browser as a non-signed-in user.
**Expected:** Maintenance page renders with zinc-950 dark background, pulsing indigo dots, heading "Handriti er að fara í glowup", and subtitle "Við erum að vinna í nýrri og betri útgáfu. Komdu aftur fljotlega!"
**Why human:** Visual rendering and actual Next.js Edge middleware execution require a running browser session.

### 2. Admin Bypass Test

**Test:** With `MAINTENANCE_MODE=true` active, sign in as an admin user and visit `http://localhost:3000`.
**Expected:** Admin sees the real app (not the maintenance page).
**Why human:** Requires an actual Clerk session with admin status in the admins DB table.

### 3. API Route Bypass During Maintenance

**Test:** With `MAINTENANCE_MODE=true` active: `curl http://localhost:3000/api/health`.
**Expected:** Returns 200 (not rewritten to maintenance page).
**Why human:** Requires running dev server.

### 4. Custom Domain After SSL Provisions

**Test:** `curl https://api.handriti.is/health`
**Expected:** Returns 200 JSON with status, version, uptime_seconds, timestamp, database fields.
**Why human:** SSL cert provisioning is async; cannot predict exact completion time.

### 5. Clerk JWT End-to-End (after auth.py fix)

**Test:** After fixing auth.py and deploying: get a valid Clerk JWT from the Next.js app (network tab, Authorization header), then run `curl -H "Authorization: Bearer <token>" https://handritib-production.up.railway.app/auth/me`.
**Expected:** Returns `{"user_id": "user_...", "claims": {...}}`. An invalid token returns 403.
**Why human:** Requires a real Clerk session token and a new Railway deployment after the fix.

---

## Gaps Summary

Two gaps remain after Railway deployment resolved the original 3 gaps.

**Gap 1: api.handriti.is SSL cert still provisioning (INFRA-05 partial)**

DNS is fully correct. The Railway custom domain is configured and HTTP redirects properly. HTTPS fails because the SSL certificate has not finished provisioning. This is a Railway infrastructure event, not a code issue. It will self-resolve. The service is fully functional via the generated domain `handritib-production.up.railway.app`.

**Gap 2: Auth dependency wiring bug in auth.py (INFRA-03 blocked)**

`get_current_user` is wired incorrectly. The dependency chain:

```python
async def get_current_user(
    credentials: Annotated[object, Depends(get_clerk_guard)],
) -> dict:
```

`get_clerk_guard()` returns a `ClerkHTTPBearer` instance. FastAPI injects this instance as `credentials`. The code then calls `dict(credentials)` on a `ClerkHTTPBearer` object (which has no `.dict()` method and is not iterable), causing `TypeError` → HTTP 500.

The correct fix — replace the lazy-factory pattern with a direct dependency on the guard instance:

```python
# At module level (after settings are available):
_clerk_guard = ClerkHTTPBearer(config=ClerkConfig(jwks_url=...))

async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials, Depends(_clerk_guard)],
) -> dict:
    if credentials is None or credentials.decoded is None:
        raise HTTPException(status_code=401, ...)
    user_id = credentials.decoded.get("sub")
    ...
    return {"user_id": user_id, "claims": credentials.decoded}
```

Or keep the lazy guard but make `get_clerk_guard` return a proper async dependency callable that FastAPI resolves through the full request cycle.

**Root cause grouping:** Both remaining gaps are non-code issues (SSL timing) or a single-function wiring bug. The underlying backend implementation (DB, CORS, health check, SQLAlchemy models) is fully functional and confirmed live.

---

_Verified: 2026-03-21T22:25:00Z_
_Verifier: Claude (gsd-verifier)_
