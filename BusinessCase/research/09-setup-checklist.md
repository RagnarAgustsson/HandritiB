# Setup Checklist — New Services

*All accounts/keys needed before development begins*

## 1. ElevenLabs (STT — Scribe v2)

**Create account:** https://elevenlabs.io/sign-up

**Get API key:**
1. Go to https://elevenlabs.io/app/settings/api-keys
2. Create a new API key
3. Save as `ELEVENLABS_API_KEY` in both Vercel and Railway env vars

**Pricing:** https://elevenlabs.io/pricing
- Creator tier ($22/mo) includes Scribe API access
- Scale tier ($99/mo) for higher volume
- Business tier for $0.22/hr (vs $0.40/hr standard) — contact sales

**Verify Icelandic support:**
1. Go to https://elevenlabs.io/speech-to-text
2. Test with an Icelandic audio clip
3. Check quality before committing

**API docs (bookmark these):**
- Realtime API reference: https://elevenlabs.io/docs/api-reference/speech-to-text
- Realtime events: https://elevenlabs.io/docs/eleven-api/guides/how-to/speech-to-text/realtime/event-reference
- Server-side streaming: https://elevenlabs.io/docs/eleven-api/guides/how-to/speech-to-text/realtime/server-side-streaming
- Client-side streaming: https://elevenlabs.io/docs/eleven-api/guides/how-to/speech-to-text/realtime/client-side-streaming
- Commit strategies: https://elevenlabs.io/docs/eleven-api/guides/how-to/speech-to-text/realtime/transcripts-and-commit-strategies
- Keyterm prompting: https://elevenlabs.io/docs/eleven-api/guides/how-to/speech-to-text/batch/keyterm-prompting
- Entity detection: https://elevenlabs.io/docs/eleven-api/guides/how-to/speech-to-text/batch/entity-detection

**SDKs to install:**
- Frontend: `npm install @elevenlabs/react` (useScribe hook)
- Backend: `pip install elevenlabs` (token generation, batch API)

---

## 2. OpenRouter (LLM gateway)

**Create account:** https://openrouter.ai/sign-up

**Get API key:**
1. Go to https://openrouter.ai/settings/keys
2. Create a new key (optionally set credit limit)
3. Save as `OPENROUTER_API_KEY` in Railway env vars

**Add credits:** https://openrouter.ai/settings/credits
- Pay-as-you-go, no monthly fee
- Start with $10-20 for development

**API docs (bookmark these):**
- Quickstart: https://openrouter.ai/docs/quickstart
- Models list: https://openrouter.ai/models
- Streaming: https://openrouter.ai/docs/features/streaming
- Fallback routing: https://openrouter.ai/docs/features/fallback
- Tool use: https://openrouter.ai/docs/features/tool-use
- Prompt caching: https://openrouter.ai/docs/features/prompt-caching

**No SDK needed.** Use the OpenAI SDK with `baseURL` override:
```python
# Python
from openai import OpenAI
client = OpenAI(base_url="https://openrouter.ai/api/v1", api_key=OPENROUTER_API_KEY)
```
```typescript
// TypeScript
import OpenAI from 'openai';
const client = new OpenAI({ baseURL: 'https://openrouter.ai/api/v1', apiKey: OPENROUTER_API_KEY });
```

---

## 3. Railway (FastAPI hosting)

**Create account:** https://railway.com/login

**Create project:**
1. Go to https://railway.com/new
2. "Deploy from GitHub repo" → select HandritiB
3. Set **Root Directory** to `backend/`
4. Set **Watch Paths** to `/backend/**`

**Add custom domain:**
1. In Railway project settings → Networking → Custom Domain
2. Add `api.handriti.is`
3. Railway gives you a CNAME record to add at your DNS provider
4. SSL is automatic

**Set environment variables** (Railway dashboard → Variables):
```
ELEVENLABS_API_KEY=...
OPENROUTER_API_KEY=...
DATABASE_URL=...              # Same Neon pooled connection string as Vercel
CLERK_JWKS_URL=https://<your-clerk-frontend-api>.clerk.accounts.dev/.well-known/jwks.json
ALLOWED_ORIGINS=https://handriti.is,http://localhost:3000
```

**Configure deployment:**
- Railway auto-detects the Dockerfile in `backend/`
- Set health check endpoint: `/health`
- Disable serverless mode (keep always-on)
- Select region: `europe-west4-drams3a` (Amsterdam) for EU

**Pricing:** https://railway.com/pricing
- Hobby: $5/mo + usage (~$25-30/mo total for a small always-on instance)
- Pro: $20/mo + usage (more replicas, longer logs)

**Docs (bookmark these):**
- Overview: https://docs.railway.com/overview/about
- Monorepo guide: https://docs.railway.com/guides/monorepo
- Dockerfile deploys: https://docs.railway.com/guides/dockerfiles
- Environment variables: https://docs.railway.com/guides/variables

---

## 4. DNS configuration (handriti.is)

**Add CNAME record for api subdomain:**
- Host: `api`
- Type: `CNAME`
- Value: (Railway will provide this, e.g., `xxx.up.railway.app`)
- TTL: 300

This goes in your DNS provider (wherever handriti.is is registered).

---

## 5. Clerk configuration update

**Get JWKS URL for FastAPI:**
1. Go to https://dashboard.clerk.com → your app → API Keys
2. Your JWKS URL is: `https://<your-frontend-api>.clerk.accounts.dev/.well-known/jwks.json`
3. Save as `CLERK_JWKS_URL` in Railway env vars

**Python library:**
```
pip install fastapi-clerk-auth
```

No changes needed to existing Clerk setup on the Vercel side.

---

## 6. Neon database (shared access)

**Get pooled connection string:**
1. Go to https://console.neon.tech → your project → Connection Details
2. Copy the **pooled** connection string (hostname includes `-pooler`)
3. Use this same string in Railway's `DATABASE_URL`

**Python library:**
```
pip install asyncpg sqlalchemy[asyncio]
```

Set `poolclass=NullPool` in SQLAlchemy to avoid double-pooling with Neon's PgBouncer.

---

## 7. Vercel configuration update

**Add new env vars to Vercel:**
- `ELEVENLABS_API_KEY` — for single-use token generation endpoint
- `NEXT_PUBLIC_API_URL=https://api.handriti.is` — so frontend knows where Railway is

**Ignored build step** (optional, for monorepo efficiency):
- In Vercel project settings → Git → Ignored Build Step
- Command: `git diff --quiet HEAD^ HEAD -- . ':!backend'`
- This skips Vercel rebuilds when only `backend/` files change

---

## Order of account setup

1. **ElevenLabs** — sign up, get API key, test Icelandic
2. **OpenRouter** — sign up, get API key, add $10 credits
3. **Railway** — sign up, connect GitHub repo, deploy skeleton
4. **DNS** — add api.handriti.is CNAME
5. **Clerk** — copy JWKS URL for Railway
6. **Neon** — copy pooled connection string for Railway
7. **Vercel** — add new env vars
