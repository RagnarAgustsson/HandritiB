# External Integrations

**Analysis Date:** 2026-02-28

## APIs & External Services

**AI/LLM:**
- OpenAI - Core transcription and text generation
  - Endpoints: `https://api.openai.com/v1/realtime/sessions`, `https://api.openai.com/v1/chat/completions`, `https://api.openai.com/v1/audio/transcriptions`
  - Used for: Real-time audio sessions, chat completions for notes/summaries, audio transcription
  - Auth: `OPENAI_API_KEY` environment variable
  - Models: `gpt-5` (chat), `gpt-4.1` (notes), `gpt-4o-transcribe` (transcription), `gpt-realtime` (realtime audio)
  - Client: Raw `fetch()` calls, no official SDK
  - Implementation files: `lib/openai.ts`, `lib/transcription.ts`, `app/api/realtime/route.ts`, `app/api/final-summary/route.ts`

**Email Delivery:**
- Resend - Purchase receipt emails
  - Client: `resend` 6.1.0 npm package
  - Auth: `RESEND_API_KEY` environment variable
  - Sender: `EMAIL_FROM` environment variable
  - Implementation: `lib/admin/receipts.ts` sends HTML/text receipts for credit purchases
  - Status: Optional (disabled if keys not configured)

## Data Storage

**Databases:**
- PostgreSQL via Supabase
  - Connection: `NEXT_PUBLIC_SUPABASE_URL` (public URL) + `SUPABASE_SERVICE_KEY` (server-only)
  - Client: `@supabase/supabase-js` 2.57.4 for auth and data access
  - SSR adapter: `@supabase/ssr` 0.7.0 for cookie-based sessions
  - Implementation: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (server), `lib/supabase/service.ts` (service)
  - Tables:
    - `recording_sessions` - Session metadata, rolling summaries, recording names, prompt profiles
    - `recording_chunks` - Audio chunks with transcripts and duration
    - `recording_messages` - Chat history (user/assistant messages)
    - `push_subscriptions` - Web push subscription tokens
    - `profiles` - User profiles with remaining seconds balance
    - `credit_purchases` - Purchase history and receipt tracking
    - `credit_packages` - Available credit packages
    - `credit_adjustments` - Credit adjustments and refunds
    - `coupons` - Discount coupons
    - `audio_pipeline` - Pipeline job queue
  - Schema files: `supabase/full_setup.sql`, `supabase/audio_pipeline.sql`, `supabase/usage.sql`, `supabase/paywall.sql`

**File Storage:**
- Local filesystem (development debug only)
  - `/tmp/handriti-transcripts` - Debug saves when `DEBUG_SAVE_LARGE_SUMMARY=1`
  - `/tmp/handriti-segments` - Debug segment saves when `LARGE_UPLOAD_SAVE_SEGMENTS=1`
  - Supabase storage (via Supabase client, not explicitly used in core code)

**Caching:**
- Browser Cache API via PWA
  - Configured in `next.config.js` with service worker caching strategies
  - Pages: Network-first or cache-first depending on `PWA_DOCUMENT_STRATEGY` env var
  - Static assets: Cache-first (30-day expiry)
  - API endpoints: Network-only for sensitive routes (`/api/upload-audio-chunk`, `/api/realtime`, `/api/notes`, `/api/summary`)

## Authentication & Identity

**Auth Provider:**
- Supabase Auth (PostgreSQL + OAuth)
  - Implementation: `app/api/auth/[...supabase]/route.ts` (Next.js Auth handler)
  - Callback: `app/api/auth/callback/route.ts` (OAuth redirect)
  - Client setup: `app/components/AuthProvider.tsx`
  - Uses: Cookies for session management in SSR mode via `@supabase/ssr`
  - Cookie config: `path=/`, `sameSite=lax`, `secure=true` (prod only), `httpOnly=true`

## Monitoring & Observability

**Error Tracking:**
- Not detected - No Sentry, Datadog, or similar integration

**Logs:**
- Console-based logging (`console.log`, `console.warn`, `console.error`)
- Snapshot debugging:
  - `lib/utils/promptSnapshot.ts` - Saves prompts for chat calls
  - `lib/utils/responseSnapshot.ts` - Saves AI responses for chat calls
  - Used for debugging when enabled in debug flags

## CI/CD & Deployment

**Hosting:**
- Vercel (inferred from next.config.js and README)
  - Environment variables synced to Vercel
  - PWA generation disabled in development

**CI Pipeline:**
- Not detected - No GitHub Actions, GitLab CI, or other CI configuration visible

## Environment Configuration

**Required env vars (critical):**
- `OPENAI_API_KEY` - Must be set for any AI operations
- `NEXT_PUBLIC_SUPABASE_URL` - Must be set for database access
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Must be set for client-side Supabase
- `SUPABASE_SERVICE_KEY` - Must be set for server-side Supabase operations

**Optional env vars:**
- `RESEND_API_KEY` - Email functionality disabled if missing
- `EMAIL_FROM` - Email functionality disabled if missing
- `WEB_PUSH_PUBLIC_KEY` / `WEB_PUSH_PRIVATE_KEY` - Push notifications disabled if missing

**Secrets location:**
- Development: `.env.local` (git-ignored)
- Production: Vercel environment variables dashboard

## Webhooks & Callbacks

**Incoming:**
- OAuth callback: `GET /api/auth/callback` - Supabase OAuth redirect
- Audio upload: `POST /api/upload-audio-chunk` - Client sends audio chunks
- Manual upload: `POST /api/audio-upload` - Client uploads full audio files
- Session creation: `POST /api/create-session` - Client creates new recording session
- Email results: `POST /api/email/results` - Manual email trigger for results (found via grep)

**Outgoing:**
- OpenAI realtime: Bidirectional WebSocket connection to `https://api.openai.com/v1/realtime/sessions`
- Push notifications: Web push to user's subscribed endpoints (stored in `push_subscriptions` table)
- Email: Sent via Resend API for purchase receipts

## API Rate Limiting

- Not explicitly configured in code reviewed
- OpenAI calls have retry logic with exponential backoff (2-4 second delays, max 2 retries) in `lib/utils/retry.ts`

## Data Persistence

**Audio:**
- Raw audio chunks stored in Supabase via `recording_chunks` table
- Transcripts persisted immediately after transcription
- No cloud storage integration for raw audio blobs detected

**Metadata:**
- Session data: `recording_sessions` (name, summary, prompt profile, timestamps)
- Messages: `recording_messages` (chat history per session)
- Usage: `profiles.seconds_remaining` tracks available recording time

---

*Integration audit: 2026-02-28*
