# Domain Pitfalls

**Domain:** Audio transcription web app — Next.js App Router + Clerk + Neon + Drizzle + OpenAI Whisper + Vercel
**Researched:** 2026-02-28
**Confidence:** HIGH for Vercel-specific limits (verified from official docs); HIGH for codebase patterns (direct code evidence); MEDIUM for OpenAI Whisper behavior (training data + official API surface)

---

## Critical Pitfalls

Mistakes that cause rewrites, data loss, or silent production failures.

---

### Pitfall 1: Vercel 4.5 MB Body Size Hard Limit Blocks Audio Uploads

**What goes wrong:** Every Vercel function has a hard 4.5 MB request body limit enforced at the infrastructure level. Sending an audio file larger than this returns 413 `FUNCTION_PAYLOAD_TOO_LARGE` — not a catchable app error, but a platform rejection before your code runs. The previous app worked around this with client-side FFmpeg chunking, which is being dropped.

**Why it happens:** Vercel serverless functions run on AWS Lambda infrastructure. The 4.5 MB limit is enforced by AWS and cannot be raised regardless of plan.

**Consequences:** Any audio upload route that accepts files directly will silently fail for real-world recordings. A 5-minute WAV at 16-bit/44kHz is ~50 MB. Even a compressed MP3 of the same length is 5–10 MB.

**Prevention:**
- For file uploads: use Vercel Blob (or another pre-signed upload service like Cloudflare R2 or S3) to upload directly from the browser to storage, bypassing the function entirely. The function only receives the URL after upload completes.
- For live chunked recording: keep chunks small enough to stay under 4 MB per request. A 10-second WebM chunk at typical browser MediaRecorder bitrates is 200–600 KB — safely under limit.
- Never send raw audio to a Next.js API route. The route should receive either a small chunk or a storage URL.

**Warning signs:** HTTP 413 errors in the network tab; uploads failing for files over ~4 MB; "FUNCTION_PAYLOAD_TOO_LARGE" in Vercel logs.

**Phase to address:** Foundation / Upload infrastructure — must be decided before any upload API routes are built. This is the single most important architectural constraint.

**Source:** https://vercel.com/docs/functions/limitations#request-body-size (VERIFIED)

---

### Pitfall 2: Vercel /tmp Is Ephemeral and Not Shared Between Invocations

**What goes wrong:** Vercel functions have 500 MB of writable `/tmp` space, but it is scoped to a single function invocation and is not guaranteed to persist or be shared across concurrent requests. Code that writes audio segments to `/tmp` in one request and expects to read them in a follow-up request will fail intermittently — especially under any load where different invocations land on different microVMs.

**Why it happens:** Each serverless invocation may run on a fresh container. Even if the container is warm and reused, concurrent requests run in separate microVM instances on Vercel.

**Consequences:** Multi-step upload pipelines that write intermediate files (chunks, converted segments) between requests will lose data. The original codebase used `fs.writeFileSync()` to save segments — this pattern is architecturally wrong on Vercel.

**Prevention:**
- Treat `/tmp` as single-request scratch space only. Write, process, and delete within one function invocation.
- For anything that must persist between requests (e.g. assembling chunks into a full file), store in Vercel Blob or Neon (as binary or reference).
- For server-side audio processing that spans multiple steps, complete the full processing pipeline within one function call, or use a background job pattern with persistent storage for intermediate state.

**Warning signs:** Transcription completing correctly on small files but failing on large multi-chunk uploads; log evidence of "file not found" errors that are intermittent.

**Phase to address:** Upload architecture design. Must be explicit in the design of the chunked upload route.

**Source:** https://vercel.com/docs/functions/runtimes#file-system-support (VERIFIED)

---

### Pitfall 3: OpenAI Whisper 25 MB File Size Limit Requires Server-Side Chunking Strategy

**What goes wrong:** The Whisper API rejects files larger than 25 MB. Audio files from real-world recordings frequently exceed this. Without a chunking strategy, large uploads silently fail at the OpenAI API boundary, not at the Vercel boundary.

**Why it happens:** Whisper's API is designed for single-file submission. The 25 MB limit is enforced server-side at OpenAI.

**Consequences:** Any audio longer than roughly 15–20 minutes (depending on codec and bitrate) will be rejected. Without explicit error handling, users see no useful error — just a failed transcription.

**Prevention:**
- Accept this constraint explicitly in the design: uploads above ~20 MB must be chunked before being sent to Whisper.
- Server-side chunking strategy (without FFmpeg): split audio by byte boundaries at silence points, or split at fixed time intervals if the format is known. For the rewrite, consider: (a) accepting only pre-compressed formats (MP3, M4A, OGG) with a client-side size warning, or (b) using a background worker pattern where a full file is split into segments, each sent to Whisper separately, and results are concatenated.
- Dropping FFmpeg means relying on format-native splitting or accepting format limitations. Document the decision explicitly in the codebase.
- Always handle `openai.audio.transcriptions.create()` errors explicitly — the SDK throws typed errors; catch `APIError` and return a meaningful message.

**Warning signs:** Transcription failing for recordings over 15 minutes; OpenAI API error 400 with "file too large"; silent empty transcripts for long files.

**Phase to address:** Transcription pipeline design. The no-FFmpeg decision creates a constraint here that must be resolved before building the large file upload path.

**Source:** Training data + OpenAI API surface (MEDIUM confidence — verify at https://platform.openai.com/docs/guides/speech-to-text)

---

### Pitfall 4: Edge Runtime and Node.js Runtime Are Mutually Incompatible

**What goes wrong:** Next.js App Router routes can declare `export const runtime = 'edge'`. Edge runtime does not have Node.js APIs: no `fs`, no `Buffer`, no `child_process`, no binary manipulation. The original codebase mixed edge and Node.js patterns, causing confusion. In a rewrite, accidentally adding `runtime = 'edge'` to a route that uses Node.js APIs causes hard build failures or runtime errors.

**Why it happens:** The App Router default is Node.js. Edge is opt-in. But developers sometimes copy edge-compatible patterns from docs examples into routes that need Node.js, or vice versa.

**Consequences:** Build-time errors that look like dependency issues; runtime crashes that only appear in production (not local); inability to use the OpenAI Node SDK in edge routes (the SDK requires Node.js).

**Prevention:**
- For this project: use Node.js runtime everywhere. No edge runtime on any route that handles audio, calls OpenAI, or uses Drizzle. This is a simpler rule than deciding per-route.
- Never export `runtime = 'edge'` unless the route does nothing but redirect or read a cookie.
- The OpenAI Node SDK (`openai` package) requires Node.js. It will not work in edge runtime.
- Clerk's `auth()` helper works in both runtimes, but Drizzle + Neon HTTP driver works in both too — so there is no reason to use edge for this app.

**Warning signs:** `TypeError: fs is not a function`; `Cannot find module 'crypto'` style errors; "Dynamic server usage" errors in unexpected places.

**Phase to address:** Project scaffolding — establish a single runtime decision at the start, document it in a comment in `next.config.ts`.

**Source:** Next.js App Router docs + direct codebase evidence from CONCERNS.md (HIGH confidence)

---

### Pitfall 5: Clerk Middleware Must Cover All Protected Routes — Misconfiguration Exposes API Routes

**What goes wrong:** Clerk requires a `middleware.ts` at the root of the project that intercepts requests and validates session tokens. If the middleware matcher does not include API routes, or if the `clerkMiddleware()` is misconfigured (e.g., using deprecated `authMiddleware()`), API routes will appear to work in development (where auth is often mocked) but expose unauthenticated access in production.

**Why it happens:** Clerk's middleware has changed across major versions. `authMiddleware` was deprecated in favor of `clerkMiddleware`. If the Next.js middleware matcher does not include `/(api|trpc)(.*)`, API routes skip auth.

**Consequences:** Unauthenticated users can call transcription and upload APIs directly. Any user can submit audio to OpenAI on your API key.

**Prevention:**
- Use `clerkMiddleware()` (not `authMiddleware`) from `@clerk/nextjs/server`.
- Set the middleware matcher to cover: `/((?!_next/static|_next/image|favicon.ico).*)` — this covers all routes including API.
- In each API route handler, call `const { userId } = await auth()` at the top and return 401 if `userId` is null.
- Never rely solely on middleware for auth enforcement in API routes — always call `auth()` inside the handler as defense in depth.

**Warning signs:** API routes accessible without authentication in production; Clerk dashboard showing no active sessions for requests that should be authenticated.

**Phase to address:** Auth scaffold — Phase 1. Every subsequent API route depends on auth being correct.

**Source:** Clerk docs (MEDIUM confidence — verify at https://clerk.com/docs/references/nextjs/clerk-middleware)

---

### Pitfall 6: Neon Postgres Connection Exhaustion in Serverless Functions

**What goes wrong:** Traditional Postgres drivers open a persistent TCP connection per client. On serverless, each cold function invocation opens a new connection, quickly exhausting Neon's connection limit (typically 100–200 on free/hobby tiers). Under load, this causes connection refused errors and query timeouts.

**Why it happens:** Serverless functions are stateless and don't reuse connections between invocations the way a long-running server does.

**Consequences:** Database queries fail with "too many clients" or connection timeout errors under moderate concurrent usage. This is the #1 cause of "works in development, breaks in production" with Neon on Vercel.

**Prevention:**
- Use the `@neondatabase/serverless` driver with `neonConfig.fetchConnectionCache = true` rather than `pg` or standard `postgres` drivers.
- Alternatively, use Neon's HTTP-mode connection (`neon()` function from `@neondatabase/serverless`) for simple queries — this uses HTTP/2 and does not hold open TCP connections.
- Initialize the Drizzle client as a module-level singleton (not inside the request handler) so Vercel's warm invocation reuses it.
- Neon also supports PgBouncer pooling — enable "Connection Pooling" in the Neon console and use the pooler connection string (port 5432 with `-pooler` suffix in the hostname).

**Warning signs:** Intermittent 500 errors under load; "too many clients already" PostgreSQL errors in logs; queries timing out after a period of inactivity followed by burst traffic.

**Phase to address:** Database setup — before any routes are built. The Drizzle client setup must use the serverless driver from day one.

**Source:** Neon docs + Drizzle docs (MEDIUM confidence — verify at https://neon.tech/docs/connect/connection-pooling)

---

### Pitfall 7: Silent Failure in Audio Chunk Pipeline — No Error Recovery

**What goes wrong:** The original app had 62 empty catch blocks that swallowed errors silently. In a chunked upload pipeline, if one chunk fails to transcribe, the session continues without that segment's text. Users get incomplete transcripts with no indication of what was lost. This is the most user-visible failure mode and the hardest to debug.

**Why it happens:** Async pipelines with multiple steps (upload → process → transcribe → save) need explicit error propagation at each step. Under time pressure, developers write `catch {}` to "handle" errors and move on.

**Consequences:** Partial transcripts presented as complete; lost audio content with no user-facing error; debugging requires log archaeology.

**Prevention:**
- Every catch block must do at least one of: re-throw, log with context, or return an error response. Never catch and continue silently.
- Design chunk status tracking from the start: each chunk record in the database has a status (`pending`, `processing`, `done`, `failed`) and an error message field.
- The UI reads chunk status from the database, not from the response of the upload request — so transient failures are visible.
- Use structured logging: log `{ sessionId, chunkIndex, error: err.message }` at minimum for any transcription failure.

**Warning signs:** Transcripts shorter than expected; gaps in transcription timestamps; any empty catch in a code review.

**Phase to address:** Transcription pipeline — explicitly design error states before implementing happy path.

**Source:** Direct codebase evidence from CONCERNS.md (HIGH confidence)

---

### Pitfall 8: Vercel Function Timeout Kills Long Transcription Jobs

**What goes wrong:** On the Hobby plan, Vercel functions have a hard 300-second (5-minute) maximum duration. On Pro with fluid compute, this extends to 800 seconds. A large audio file transcription pipeline — especially one that fetches from storage, chunks, sends multiple Whisper requests sequentially, and then runs GPT-4o summarization — can easily exceed 300 seconds for a 60-minute recording.

**Why it happens:** Each Whisper request takes 5–30 seconds depending on segment length. A 60-minute recording split into 10-minute segments = 6 Whisper calls = potentially 60–180 seconds of OpenAI latency, plus download time, plus GPT-4o summarization.

**Consequences:** On Hobby: transcription of recordings over ~20 minutes will silently timeout. The function is killed, but the client may not receive a clean error — it gets a 504 `FUNCTION_INVOCATION_TIMEOUT`.

**Prevention:**
- For large file uploads: decouple the upload from the transcription. The upload API route saves the file to storage and creates a `pending` job record in the database, then returns immediately (< 1s). A separate processing step handles the Whisper calls.
- For Vercel: use Vercel Cron + a separate long-running processing function, or use a background task pattern where the client polls for status.
- Set `export const maxDuration = 300` explicitly on processing routes so the behavior is documented and deliberate.
- Consider streaming responses for live recording (the chunked path) — stream each chunk result back to the client so partial results are visible even if the function eventually times out.

**Warning signs:** 504 errors for long recordings; processing starting but never completing for files over 20 minutes; no database record of completion despite upload succeeding.

**Phase to address:** Large file upload architecture — before implementation. This determines whether the app needs async job processing or can stay synchronous.

**Source:** Vercel docs (VERIFIED — https://vercel.com/docs/functions/limitations#max-duration) + domain knowledge (HIGH confidence)

---

### Pitfall 9: WebSocket / GPT Realtime Cannot Run on Vercel Serverless Functions

**What goes wrong:** The GPT Realtime API uses WebSocket connections that must remain open for the duration of a session — potentially minutes. Vercel serverless functions cannot maintain a persistent WebSocket connection. The function returns a response and terminates; you cannot hold a WebSocket open across the HTTP request-response cycle.

**Why it happens:** Serverless architecture is fundamentally request-response. WebSocket requires a persistent TCP connection, which is incompatible with stateless function execution.

**Consequences:** The GPT Realtime session feature from the original app cannot be implemented as a serverless API route. Any attempt will appear to work locally (where Next.js runs a real Node.js server) but fail on Vercel.

**Prevention:**
- WebSocket-based Realtime must be proxied through the browser directly to OpenAI — the browser establishes the WebSocket connection to OpenAI's endpoint using a session token obtained from your API.
- The Next.js function creates a short-lived session token (ephemeral key) via the REST API, returns it to the client, and then the client connects to OpenAI directly over WebSocket.
- This is the documented pattern for GPT Realtime in browser environments: https://platform.openai.com/docs/guides/realtime/webrtc
- Never attempt to proxy audio over WebSocket through a Vercel function.

**Warning signs:** WebSocket connections closing immediately after function timeout on Vercel; working locally but failing in production; "WebSocket is closed before the connection is established" errors.

**Phase to address:** GPT Realtime feature phase — must be designed with the client-direct connection pattern from the start.

**Source:** OpenAI Realtime docs + Vercel architecture constraints (MEDIUM confidence — verify at https://platform.openai.com/docs/guides/realtime)

---

## Moderate Pitfalls

---

### Pitfall 10: Drizzle Migrations Diverge From Actual Database Schema

**What goes wrong:** Drizzle generates migration SQL from schema changes. If a developer modifies the schema file but forgets to generate a new migration, or generates a migration but forgets to run it against the production database, the app crashes with column-not-found errors in production while working fine in development (which may have been migrated separately).

**Why it happens:** Unlike Supabase's migration UI or Prisma's migrate dev flow, Drizzle's migration process is explicit and manual — you run `drizzle-kit generate`, then `drizzle-kit migrate`. One step without the other creates drift.

**Prevention:**
- Add migration check to the Vercel build step: run `drizzle-kit migrate` as part of the build command in `package.json`, not manually. This ensures the production database is always in sync with the deployed schema.
- Keep schema files as the single source of truth — never alter the production database directly.
- Name migration files descriptively (Drizzle uses timestamps by default, which is fine).

**Warning signs:** "column does not exist" errors in production; different behavior between local and deployed environments; migration files that don't match what the database actually contains.

**Phase to address:** Database schema phase — establish the migration discipline before any schema is created.

---

### Pitfall 11: Icelandic Language Instruction Must Be In Every Prompt

**What goes wrong:** OpenAI models default to English output unless explicitly instructed otherwise. GPT-4o is capable of Icelandic, but will default to English if no language instruction is present, and may mix languages if the prompt contains English phrases without explicit language direction.

**Why it happens:** System prompts often omit explicit language instructions, assuming the model will respond in the language of the input. For Icelandic audio, Whisper may output Icelandic text, but GPT-4o summarization will still default to English unless told otherwise.

**Prevention:**
- Every GPT-4o prompt that produces user-visible output must include an explicit instruction: `"Svaraðu alltaf á íslensku."` (Always respond in Icelandic.) or similar.
- Whisper supports a `language: 'is'` parameter that forces Icelandic transcription and prevents hallucination into similar-sounding languages.
- Store prompt templates as named constants in a single `lib/prompts.ts` file — never inline prompts in route handlers. This makes language instructions easy to audit.

**Warning signs:** Summaries appearing in English for Icelandic recordings; Whisper transcripts containing Danish or Norwegian words (closely related languages that Whisper may confuse).

**Phase to address:** Transcription + summarization implementation.

---

### Pitfall 12: Multiple Sources of Truth for Session State Cause UI Inconsistency

**What goes wrong:** The original app had credit display showing zero when the user had remaining seconds, caused by three separate state sources (auth context, API response, local state) with no clear precedence. In the rewrite, if session state (transcript content, processing status, remaining usage) is maintained in both React state and database, they will diverge.

**Why it happens:** Optimistic UI updates local state immediately, while database writes are async. If the write fails, local state no longer reflects reality. With multiple components reading from different sources, consistency breaks.

**Prevention:**
- Choose one source of truth per piece of data: database for persistent state (transcript, session status), React state only for ephemeral UI state (is-recording, upload-progress).
- For transcript content: write to the database on each chunk, read from the database on page load. Never reconstruct from local state alone.
- Use server components or SWR/React Query to keep database state synchronized rather than manually managing local copies.

**Warning signs:** UI showing stale data after page refresh; inconsistent display between tabs; state that "resets" on page reload.

**Phase to address:** Session management design — establish data ownership rules before building UI components.

---

### Pitfall 13: API Route Auth Check Bypassed by Missing `await`

**What goes wrong:** Clerk's `auth()` in the App Router is an async function. A common mistake is calling `auth()` without `await`, which returns a Promise object (truthy) rather than the auth object. The `userId` check then passes when it should fail.

**Why it happens:** Developers familiar with Clerk v4's synchronous `auth()` (which returned synchronously in some configurations) or who copy code snippets without attention to async patterns.

**Consequences:** All API routes appear to be authenticated when they are actually open. `userId` is always truthy (it's a Promise), so `if (!userId) return 401` never fires.

**Prevention:**
- Always write `const { userId } = await auth()`.
- TypeScript helps here: if `auth` returns `Promise<{ userId: string | null }>`, forgetting `await` produces a type error on destructuring.
- Use a shared `requireAuth()` utility function that wraps `await auth()` and throws if unauthenticated — forces the pattern to be consistent.

**Warning signs:** All API requests succeeding regardless of session state; Clerk dashboard showing no authenticated requests despite the app working.

**Phase to address:** Auth scaffold — establish the `requireAuth()` pattern before building any protected route.

---

### Pitfall 14: In-Memory State Is Lost on Every Cold Start

**What goes wrong:** The original codebase had an in-memory job queue (`lib/pipeline/jobQueue.ts`) and a WebM header cache (a global Map). These are initialized fresh on every cold start. On Vercel, cold starts happen when the function has been idle, when a new deployment occurs, or when concurrent load spins up new instances. Any state in these structures is lost.

**Why it happens:** JavaScript module-level variables persist within a single warm invocation, creating the illusion of persistence. Under low load locally, the same instance handles most requests. On Vercel under real load, multiple instances run simultaneously, each with their own isolated memory.

**Consequences:** Job queue: in-flight transcription jobs are lost on cold start — user never gets their transcript. Header cache: chunks sent to a new instance lack the shared WebM header, causing malformed audio.

**Prevention:**
- No application state in module-level variables except the database client singleton.
- Job queue state belongs in the database: a `jobs` table with status, created_at, attempts, error fields.
- WebM header (if still needed): store per-session in the database or Vercel Blob, keyed by sessionId.
- Rule: if losing this data would break user experience, it goes in the database.

**Warning signs:** Transcription jobs that start but never complete; WebM audio corruption happening intermittently; behavior that differs between the first request after deployment and subsequent requests.

**Phase to address:** Chunked upload and job processing phases.

---

## Minor Pitfalls

---

### Pitfall 15: Whisper Hallucination on Silent or Near-Silent Audio

**What goes wrong:** Whisper does not return an empty transcript for silence — it hallucinates common Icelandic phrases or produces repetitive artifacts like "Þakka þér" (Thank you) repeated dozens of times. This is a known Whisper behavior.

**Prevention:**
- Detect and skip near-silent chunks before sending to Whisper. Check audio energy level (RMS) in the browser before uploading or on the server before calling the API.
- If a chunk returns a suspiciously short or highly repetitive transcript, treat it as likely hallucination and discard rather than appending.
- The original app had a `isDegenerateTranscript()` heuristic. Keep a simpler version of this: check if the transcript is >80% repeated n-grams.

**Phase to address:** Transcription pipeline.

---

### Pitfall 16: Vercel Environment Variables Not Available at Build Time Without `NEXT_PUBLIC_` Prefix

**What goes wrong:** Clerk publishable key and other client-side config must be prefixed `NEXT_PUBLIC_` to be embedded in the browser bundle. Secret keys (Clerk secret key, OpenAI API key, Neon connection string) must NOT have this prefix and must only be used server-side. Mixing these up either exposes secrets in the client bundle or causes "undefined" errors in the browser.

**Prevention:**
- Clerk publishable key: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (client-safe, in browser bundle).
- Clerk secret key: `CLERK_SECRET_KEY` (server-only, never in client code).
- OpenAI API key: `OPENAI_API_KEY` (server-only).
- Neon connection string: `DATABASE_URL` (server-only).
- Use a `lib/env.ts` file that validates required env vars at startup using `process.env` checks and throws descriptively if missing.

**Phase to address:** Project scaffold.

---

### Pitfall 17: `maxDuration` Not Set on Long-Running Routes

**What goes wrong:** Without `export const maxDuration`, Vercel applies the project default (300s). This is actually the maximum on Hobby, so it does not help. But it means the intent is undocumented and the setting is invisible in code review.

**Prevention:**
- Explicitly set `export const maxDuration = 300` on any route that calls OpenAI, handles file processing, or runs database-heavy operations. This documents the expected duration and prevents silent truncation if the default changes.
- Set it to a lower value (e.g., 30) on fast utility routes to surface runaway queries early.

**Phase to address:** API route implementation.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|----------------|------------|
| Project scaffold | Missing `NEXT_PUBLIC_` prefix on Clerk key | Create `lib/env.ts` with explicit validation |
| Auth setup | `auth()` without `await`, missing middleware matcher | Use `requireAuth()` wrapper, test unauthenticated access |
| Database setup | Connection exhaustion on Vercel | Use `@neondatabase/serverless` driver, enable Neon connection pooling |
| Database schema | Migrations not applied to production | Run `drizzle-kit migrate` in build step |
| Upload routes | 4.5 MB Vercel body limit | Use pre-signed upload to Vercel Blob; never send audio through Next.js API route |
| Chunked recording | WebM header cache in memory | Store session header in database keyed by sessionId |
| Transcription pipeline | Silent errors, partial transcripts | Track per-chunk status in database; every catch must log |
| Large file upload | 25 MB Whisper limit | Chunk server-side within single function invocation; or require pre-compressed formats |
| Large file processing | 300s function timeout | Decouple upload from processing; use async job pattern with polling |
| GPT Realtime | WebSocket impossible on serverless | Client connects to OpenAI directly using ephemeral token from your API |
| Icelandic output | GPT-4o defaults to English | Add explicit language instruction to every prompt; pass `language: 'is'` to Whisper |
| Session state UI | Multiple state sources diverging | Database is source of truth; React state is display-only |
| In-memory queues | Lost on cold start | All job state in database; no module-level mutable state |
| Edge runtime | Accidentally used on Node.js routes | Rule: no edge runtime in this project; document in next.config.ts |

---

## Sources

| Claim | Source | Confidence |
|-------|--------|------------|
| 4.5 MB Vercel body limit | https://vercel.com/docs/functions/limitations#request-body-size | HIGH — verified |
| 500 MB /tmp scratch space | https://vercel.com/docs/functions/runtimes#file-system-support | HIGH — verified |
| 300s max duration (Hobby), 800s (Pro with fluid compute) | https://vercel.com/docs/functions/configuring-functions/duration | HIGH — verified |
| 1,024 file descriptors shared across concurrent executions | https://vercel.com/docs/functions/limitations#file-descriptors | HIGH — verified |
| 2 GB memory (Hobby), 4 GB (Pro) | https://vercel.com/docs/functions/limitations#memory-size-limits | HIGH — verified |
| Whisper 25 MB file size limit | https://platform.openai.com/docs/guides/speech-to-text | MEDIUM — verify against current docs |
| Whisper `language: 'is'` parameter | OpenAI API surface — training data | MEDIUM — verify at API reference |
| Clerk `clerkMiddleware()` replaces `authMiddleware()` | https://clerk.com/docs/references/nextjs/clerk-middleware | MEDIUM — verify against current Clerk version |
| GPT Realtime ephemeral token pattern | https://platform.openai.com/docs/guides/realtime | MEDIUM — verify current WebRTC/WebSocket guidance |
| Empty catch blocks, in-memory state, credit race conditions | CONCERNS.md — direct codebase analysis | HIGH — direct evidence |
| Neon serverless driver for connection pooling | https://neon.tech/docs/connect/connection-pooling | MEDIUM — verify current driver recommendations |
