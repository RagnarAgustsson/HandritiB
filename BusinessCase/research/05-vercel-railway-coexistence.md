# Vercel + Railway Coexistence — Architecture

*Researched: 2026-03-21*

## Routing

**Subdomain approach (recommended):**
- `handriti.is` → Vercel (Next.js frontend + existing API routes)
- `api.handriti.is` → Railway (FastAPI agent backend)
- Client env: `NEXT_PUBLIC_API_URL=https://api.handriti.is`

CORS on FastAPI:
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://handriti.is", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## Auth sharing (Clerk)

**`fastapi-clerk-auth`** (v0.0.9, production/stable):
```python
from fastapi_clerk_auth import ClerkConfig, ClerkHTTPBearer
clerk_config = ClerkConfig(jwks_url="https://.../.well-known/jwks.json")
clerk_auth_guard = ClerkHTTPBearer(config=clerk_config)

@app.get("/protected")
async def protected(credentials=Depends(clerk_auth_guard)):
    return credentials  # decoded JWT payload
```

Client sends: `Authorization: Bearer <token>` from `useAuth().getToken()`.

For WebSocket: pass token as query param or in first message, verify on connection.

## Database sharing (Neon)

Both Drizzle (Next.js) and SQLAlchemy (FastAPI) connect to the same Neon PostgreSQL.

- Use **pooled** connection string (hostname with `-pooler` suffix) for both
- PgBouncer transaction mode: no session-level features (SET/RESET, PREPARE)
- SQLAlchemy: `pool_pre_ping=True`, `poolclass=NullPool` (avoid double-pooling)
- **Drizzle owns migrations.** SQLAlchemy models mirror tables but never run migrations.

## Monorepo structure

**Recommended (minimal disruption):**
```
HandritiB/              ← repo root
  app/                  ← Next.js (existing)
  lib/                  ← shared TS libs (existing)
  backend/              ← FastAPI (new)
    app/
    requirements.txt
    Dockerfile
  BusinessCase/         ← MBA spec + research
  CLAUDE.md
  package.json
```

- Vercel root: `/` (no change)
- Railway root: `backend/`
- Railway watch paths: `/backend/**`
- Vercel ignored build step: skip when only `backend/` changes

## Schema sync

Drizzle schema (3 main tables: sessions, chunks, notes + supporting tables).

**Approach:** Manual SQLAlchemy models mirroring Drizzle.
```python
class Session(Base):
    __tablename__ = "sessions"
    id = Column(Text, primary_key=True)
    user_id = Column(Text, nullable=False)
    # ... mirror schema.ts columns
```

Small schema makes manual sync trivial. Verify with test that queries `information_schema.columns`.
