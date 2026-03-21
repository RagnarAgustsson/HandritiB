# Phase 6: Infrastructure + Maintenance Mode - Context

**Gathered:** 2026-03-21
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy a maintenance page on the existing Vercel app and scaffold a FastAPI backend on Railway — giving a safe, reversible foundation for the entire v2 migration. The maintenance page is toggleable via env var. The FastAPI backend is reachable at api.handriti.is with shared Clerk auth and Neon DB access.

</domain>

<decisions>
## Implementation Decisions

### Maintenance Page
- Playful, exciting tone — "Handriti er að fara í glowup" energy, tease the upgrade
- Message and logo only — no feature teasers, no email signup, no countdown
- Dark theme consistent with the app (zinc-950 background, indigo accents)
- Admin bypass — admins (via Clerk role) see the real app while everyone else sees the maintenance page
- Triggered by `MAINTENANCE_MODE=true` env var on Vercel — no code deploy needed

### Railway FastAPI Scaffold
- Python 3.12
- Dependency management: uv (generates requirements.txt / lockfile for Docker)
- Flat app package structure: backend/app/main.py, routers/, models/, services/
- Detailed health check endpoint: returns version, uptime, DB connectivity status, timestamp

### Subdomain + CORS
- api.handriti.is routes via DNS CNAME to Railway custom domain (no Vercel proxy)
- DNS managed at isnic.is — CNAME record for api.handriti.is added there
- CORS: strict production origins only (handriti.is, *.handriti.is), localhost:3000 added via env var for dev
- Vercel /api/health and Railway api.handriti.is/health are separate endpoints — no conflict

### Deployment Pipeline
- Custom Dockerfile with Python 3.12 + uv
- Railway watches main branch, root directory set to backend/
- EU West region (closest to Iceland and Neon EU database)
- Ruff for linting + formatting from day one

### Claude's Discretion
- Exact maintenance page layout and animation (if any)
- Dockerfile layer caching strategy
- SQLAlchemy model structure for read-only mirror
- Clerk JWT verification library choice for FastAPI (fastapi-clerk-auth or manual JWKS)
- Railway health check configuration details
- Ruff configuration specifics

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- proxy.ts (middleware): Clerk + next-intl routing — maintenance mode check will be added here
- /api/health route: Existing Vercel health check, Railway gets its own at api.handriti.is/health

### Established Patterns
- Clerk v6 middleware with createRouteMatcher for public/protected routes
- next-intl routing for 4 locales (is, nb, da, sv)
- Drizzle ORM owns all DB migrations — SQLAlchemy in backend/ is read-only mirror
- Dark theme: zinc-950 background, indigo-500 primary buttons
- API routes use @/ path aliases

### Integration Points
- proxy.ts middleware — maintenance mode check inserted before auth/i18n routing
- Neon DATABASE_URL — shared between Vercel (Drizzle) and Railway (SQLAlchemy)
- Clerk JWT — Vercel native, Railway verifies via JWKS endpoint
- DNS at isnic.is — new CNAME record for api.handriti.is

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 06-infrastructure-maintenance-mode*
*Context gathered: 2026-03-21*
