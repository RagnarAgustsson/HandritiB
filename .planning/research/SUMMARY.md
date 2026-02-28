# Project Research Summary

**Project:** Handriti — Icelandic audio transcription and AI summarization
**Domain:** Real-time and async audio transcription web app (single-language, AI-native)
**Researched:** 2026-02-28
**Confidence:** MEDIUM (stack versions need verification; architecture and pitfalls are HIGH from direct codebase evidence)

---

## Executive Summary

Handriti is a clean rewrite of a proven, working Icelandic transcription tool. The core architecture pattern — browser MediaRecorder sending chunked audio to a Next.js API route, which calls Whisper, then GPT-4o, then writes to Postgres, with SSE pushing results back to the browser — is already validated in production. The rewrite's goal is not to invent new patterns but to replace fragile dependencies (Supabase auth, client-side FFmpeg, raw fetch) with independently-debuggable layers: Clerk for auth, Neon+Drizzle for data, the OpenAI SDK for AI. Three distinct recording flows (live chunked, file upload, GPT Realtime WebSocket) share a common pipeline layer and must be built in dependency order.

The most important architectural constraint is Vercel's 4.5 MB request body limit, which makes it impossible to send audio files directly through Next.js API routes. All audio uploads must go directly from the browser to Vercel Blob (or equivalent pre-signed storage), with the API route receiving only the storage URL. For live chunked recording, this is not a problem — 10-second WebM chunks are 200–600 KB. For file uploads, it is the single most important infrastructure decision and must be resolved before any upload routes are built. The GPT Realtime flow sidesteps this entirely by having the browser connect directly to OpenAI using a short-lived ephemeral token issued by the server.

The rewrite has no novel unknowns: every flow exists in the original codebase, every stack decision is pre-decided, and the pitfalls are documented from real production failures. The risk is not discovering what to build — it is disciplined avoidance of the anti-patterns that broke the original (in-memory state that evaporates on cold starts, empty catch blocks that swallow chunk failures, client-side FFmpeg WASM that breaks auth popups, and credits logic that created race conditions). Build in strict dependency order, treat the database as the only source of truth, and test each stage gate before moving on.

---

## Key Findings

### Recommended Stack

The stack is pre-decided and well-suited to the problem. Next.js 15 App Router on Vercel provides the full-stack framework with native support for Server Components (data-fetching pages), streaming SSE responses, and multipart form data handling. Clerk handles auth without any custom session logic — one `middleware.ts` file protects all routes. Neon Postgres via the `@neondatabase/serverless` HTTP driver avoids TCP connection exhaustion on serverless, and Drizzle ORM provides type-safe SQL with schema-as-code and plain SQL migrations. The OpenAI SDK handles Whisper transcription, GPT-4o summarization, and Realtime token issuance with streaming, retries, and typed errors at a fraction of the code that raw fetch required.

The most important stack constraint: use Node.js runtime on all routes that touch OpenAI, audio, or file I/O. Edge runtime does not support `Buffer`, `fs`, or the OpenAI Node SDK. Never declare `runtime = 'edge'` on any route in this project — document this rule in `next.config.ts` on day one.

**Core technologies:**
- **Next.js 15 (App Router, Node.js runtime):** Full-stack framework — App Router reduces client bundle; Vercel deploys with zero config; Node.js runtime required for OpenAI SDK
- **Clerk (`@clerk/nextjs` v6):** Authentication — pre-decided; `clerkMiddleware()` + `auth()` handles all session concerns without custom cookie logic
- **Neon + `@neondatabase/serverless`:** Postgres database — pre-decided; HTTP-mode driver prevents TCP connection exhaustion in serverless; no pgBouncer needed
- **Drizzle ORM + drizzle-kit:** Data layer — type-safe SQL, schema-as-code, plain SQL migrations; no binary query engine (unlike Prisma), no cold-start penalty
- **OpenAI SDK v4:** AI layer — Whisper transcription (`language: 'is'`), GPT-4o summarization (streaming), Realtime ephemeral token issuance
- **Tailwind CSS v4 + shadcn/ui:** Styling — CSS-native config in v4; shadcn components are copy-paste, no version lock-in; excellent Claude Code coverage
- **React Context + useState:** State management — no Zustand/Jotai needed; state is per-session and shallow

**Critical version note:** Verify all package versions with `npm show [pkg] version` before scaffolding. Drizzle in particular ships frequently. See STACK.md for the full verification command list.

### Expected Features

The rewrite MVP must match the existing app's validated capabilities without regression. Users who rely on Handriti today expect all seven proven features to work at launch. The live recording + chunked transcription flow is the highest-value feature and should be the first to reach a working state.

**Must have (table stakes — ship in v1):**
- Live audio recording via browser MediaRecorder — core product promise
- Real-time transcription + rolling notes during recording — users need feedback that it's working
- File upload for pre-recorded audio — users have existing recordings
- AI-generated final summary in Icelandic — the primary value proposition
- Session history list + session detail view — users return to previous recordings
- User authentication + session persistence — sessions are personal data
- Session profiles (meeting, lecture, interview, casual) — context shapes summary quality
- Mobile browser recording support — most impromptu recordings happen on phones
- Progress/loading feedback during processing — 30–120s silence feels broken

**Should have (high-value differentiators, include if low-effort):**
- GPT Realtime WebSocket mode — existing differentiator, unique in Icelandic context; must ship in v1
- Copy button on transcript/notes/summary — trivial effort, high daily use
- Session rename — single DB field, trivial inline-edit UI
- Rolling/live summary during recording — users see the story forming as they speak

**Defer explicitly (write as tickets, not code):**
- Session search — wait until users have enough sessions to need it
- Export to text/markdown — useful but not blocking
- Share session via public link — useful but adds auth surface area
- Speaker diarization hints — research as Phase 2 item
- Icelandic vocabulary priming per profile — Phase 2 enhancement

**Do not build (anti-features):**
- Credit/payment system — Stripe complexity is out of scope; launch free
- Email delivery (Resend) — not core; users copy-paste what they need
- Push notifications — service worker/VAPID complexity for low value
- Client-side FFmpeg — breaks COOP/COEP headers required by Clerk auth popups; 30MB bundle
- Team workspaces, calendar integrations, CRM integrations — separate products

### Architecture Approach

Three recording flows share a common server-side pipeline layer (`lib/pipeline/`) that orchestrates Whisper transcription, GPT-4o summarization, and Neon persistence. Routes handle HTTP concerns only (auth check, request parsing, response format) and delegate all business logic to pipeline functions. The database is the single source of truth for all session state — React state is display-only. No module-level mutable state except the Drizzle client singleton.

**Major components:**
1. **`lib/pipeline/`** — Transcription, summarization, chunk processing, Icelandic prompt builders; shared by all three flows; never imported in client components
2. **`lib/db/`** — Drizzle schema, session CRUD, chunk CRUD; server-only; the only place that writes to Neon
3. **`app/api/chunk/`** — Receives live audio blobs from MediaRecorder; runs pipeline; returns transcript+seq to client
4. **`app/api/upload/`** — Receives storage URL (NOT raw file); fetches from storage, splits, runs pipeline per segment; `maxDuration = 300`
5. **`app/api/realtime/`** — Issues OpenAI ephemeral token; client connects to OpenAI WebSocket directly; no server proxy
6. **`app/api/stream/`** — SSE endpoint; polls Neon every 300ms for new notes/summaries; emits to browser
7. **`RecordClient.tsx` / `UploadClient.tsx` / `RealtimeClient.tsx`** — Client components; no DB or OpenAI imports; communicate only through API routes
8. **`middleware.ts`** — Clerk auth guard; `clerkMiddleware()` with `createRouteMatcher`; covers all `/api/*` routes

**Key pattern to enforce:** Route → Pipeline → DB. No route writes to Neon directly. No pipeline function knows about HTTP. No client component touches OpenAI or Drizzle.

**Icelandic constraint:** Every GPT-4o prompt must include an explicit Icelandic instruction (`"Svaraðu alltaf á íslensku."`). Every Whisper call must pass `language: 'is'`. These must be constants in `lib/pipeline/prompts.ts` — never inlined in route handlers where they can drift.

### Critical Pitfalls

These are the pitfalls most likely to cause silent failures or require a rewrite of a phase. Full details with prevention strategies in PITFALLS.md.

1. **Vercel 4.5 MB body size limit blocks file uploads** — Never send audio files through Next.js API routes. Use Vercel Blob for direct browser-to-storage upload; API route receives URL only. This must be decided before any upload route is built. (PITFALLS.md #1)

2. **In-memory state evaporates on cold start** — The original's `jobQueue.ts` and `webmHeaderCache` Map are lost on every cold start. In the rewrite: zero module-level mutable state. All job state in the database with a `status` field per chunk. WebM header (if needed) stored in Neon keyed by sessionId. (PITFALLS.md #14)

3. **Vercel function timeout kills long transcription jobs** — 300s max on Hobby, 800s on Pro with fluid compute. A 60-minute recording split into segments could exhaust this. Solution: decouple upload (fast, returns storage URL) from processing (background, polls for status). For live chunked recording, this is not an issue — each chunk is one POST handled in < 30s. (PITFALLS.md #8)

4. **Silent chunk pipeline failures** — The original had 62 empty catch blocks. In the rewrite: every chunk record has a `status` field (`pending`/`processing`/`done`/`failed`). Every catch block must log `{ sessionId, chunkIndex, error }` at minimum. The UI reads chunk status from the database, not from POST response. (PITFALLS.md #7)

5. **Clerk `auth()` called without `await` passes auth silently** — Clerk's App Router `auth()` is async. Forgetting `await` returns a truthy Promise instead of `{ userId: string | null }`, making every route appear authenticated. Use a shared `requireAuth()` utility that wraps `await auth()` and throws on null. (PITFALLS.md #13)

---

## Implications for Roadmap

The architecture research provides an explicit build order (Stages 1–5 in ARCHITECTURE.md). The pitfalls research adds hard constraints on when certain decisions must be made. Combined, the suggested phase structure is:

### Phase 1: Foundation + Auth + Database

**Rationale:** Every other phase depends on auth being correct, the database schema being stable, and the pipeline modules existing. This phase creates the skeleton that all three recording flows attach to. Building this wrong causes rework across all subsequent phases.

**Delivers:** Working Next.js app with Clerk auth, Neon Postgres connected via Drizzle, all schema tables created, pipeline modules for transcription and summarization (not wired to routes yet), and a single working test: POST an audio blob to a test script, see a note row in Neon.

**Features addressed:** User authentication, session persistence (prerequisite for all features)

**Pitfalls to avoid:**
- Set up `@neondatabase/serverless` HTTP driver from day one — no TCP-mode pg driver (Pitfall #6)
- Establish `requireAuth()` wrapper before any route is built (Pitfall #13, #5)
- Add `drizzle-kit migrate` to the Vercel build step before any schema exists (Pitfall #10)
- Document `runtime = 'nodejs'` rule in `next.config.ts` (Pitfall #4)
- Create `lib/env.ts` with explicit env var validation and `NEXT_PUBLIC_` rules (Pitfall #16)
- Initialize Drizzle client as module-level singleton in `lib/db/client.ts` only (Pitfall #6)

**Research flag:** Standard patterns — skip phase research. Clerk + Neon + Drizzle setup is well-documented.

---

### Phase 2: Live Recording Flow (Chunked MediaRecorder)

**Rationale:** This is the highest-value feature and the one most users interact with daily. It exercises the full pipeline (chunk upload → Whisper → GPT-4o → Neon → SSE → browser) which validates all pipeline infrastructure before the more complex upload and realtime flows are built. The SSE infrastructure built here is reused in Phase 3.

**Delivers:** Working end-to-end live recording: user records, sees real-time transcription and rolling notes in the browser, stops recording, views final summary on results page.

**Features addressed:** Live recording, real-time transcription, rolling notes/summary, session profiles, session history, session detail view

**Architecture components:** `app/api/chunk/`, `app/api/stream/` (SSE), `app/api/session/`, `RecordClient.tsx`, results page

**Pitfalls to avoid:**
- Do NOT store WebM header in memory — key by sessionId in Neon (Pitfall #14)
- Each chunk must have a `status` field in the DB — track `failed` explicitly (Pitfall #7)
- Include Icelandic instruction in every prompt from the first commit (Pitfall #11)
- Pass `language: 'is'` to every Whisper call (Pitfall #11)
- Set `export const maxDuration = 30` on chunk route (documents expected duration) (Pitfall #17)
- Add silence/degenerate transcript detection before sending to Whisper (Pitfall #15)
- SSE poll interval: 300ms, not 100ms — reduces unnecessary DB load

**Research flag:** Standard patterns — chunked MediaRecorder + SSE is well-established. No phase research needed.

---

### Phase 3: File Upload Flow

**Rationale:** File upload is more complex than live recording due to the 4.5 MB Vercel body limit and 25 MB Whisper limit. The storage architecture (browser-to-Vercel-Blob direct upload) must be decided and implemented here. This flow reuses the pipeline modules from Phase 1 and the results page from Phase 2.

**Delivers:** Working file upload: user selects audio file, it uploads directly to Vercel Blob from the browser, the API route receives the URL, processes segments sequentially, and redirects to the results page.

**Features addressed:** File upload for pre-recorded audio, progress feedback, final summary

**Architecture components:** `app/api/upload/`, `UploadClient.tsx`, server-side segment splitting, session finalize

**Pitfalls to avoid:**
- Audio must go browser → Vercel Blob → URL to API route. Never through Next.js route body (Pitfall #1)
- `/tmp` is single-invocation scratch only — process and discard within one function call (Pitfall #2)
- Whisper rejects files > 25 MB — all segments must be split to < 20 MB before Whisper calls (Pitfall #3)
- Process segments sequentially within one function, not across multiple requests (Pitfall #2)
- Set `export const maxDuration = 300` on upload processing route (Pitfall #8, #17)
- For very long recordings: decouple storage URL receipt (fast response) from segment processing (async job with status polling) (Pitfall #8)
- Handle `openai.APIError` explicitly on each Whisper call — log segment index and file size (Pitfall #7)

**Research flag:** Needs deeper research during planning. The Vercel Blob integration pattern (browser-side upload, signed URL generation, route processing after) has specific API shapes that should be verified against current Vercel Blob docs before implementation.

---

### Phase 4: GPT Realtime Flow (WebSocket)

**Rationale:** The Realtime flow is architecturally isolated — it uses a completely different audio path (browser WebSocket direct to OpenAI) and does not share infrastructure with chunked recording or file upload beyond the final session save. Building it last means the session persistence layer is already tested and the client-side auth pattern is already established.

**Delivers:** Working GPT Realtime mode: user starts a session, browser connects directly to OpenAI over WebSocket using an ephemeral token issued by the server, speaks Icelandic, receives AI responses, session is saved to Neon at the end.

**Features addressed:** GPT Realtime WebSocket mode (key differentiator)

**Architecture components:** `app/api/realtime/` (ephemeral token only), `RealtimeClient.tsx` (WebSocket management)

**Pitfalls to avoid:**
- The server MUST NOT proxy the WebSocket — it only issues the ephemeral token. All audio flows browser-to-OpenAI directly. Proxying will fail on Vercel serverless. (Pitfall #9)
- The `app/api/realtime/` route needs only a fast Node.js POST handler — no `maxDuration` increase needed
- Client WebSocket connection must handle reconnection and session end gracefully — transcript accumulates client-side, POST to `/api/session` on end

**Research flag:** Needs verification. The OpenAI Realtime API ephemeral token flow and WebSocket URL format should be checked against current OpenAI docs before implementation (API has evolved since training data cutoff).

---

### Phase 5: Polish + Deployment

**Rationale:** Cross-cutting concerns that apply across all flows: session list/dashboard UI, Icelandic language QA pass across all AI outputs, error boundaries for user-facing failures, copy buttons, session rename, mobile browser testing, and Vercel production deployment with environment variables documented.

**Delivers:** Production-ready app: home dashboard, session management, consistent Icelandic output across all flows, graceful error handling, Vercel deploy with documented env var setup, mobile browser recording validated.

**Features addressed:** Session list, session rename, copy buttons, mobile recording, error messages, Vercel deployment

**Pitfalls to avoid:**
- Audit every GPT-4o prompt for the Icelandic instruction before declaring done (Pitfall #11)
- Test unauthenticated access to every API route in production (Pitfall #5)
- Verify environment variables are correctly split between `NEXT_PUBLIC_` and server-only (Pitfall #16)
- Test mobile Safari and Chrome recording specifically — MediaRecorder codec support varies (FEATURES.md table stakes)

**Research flag:** Standard patterns — polish and deployment are well-documented for this stack.

---

### Phase Ordering Rationale

- **Phase 1 before everything:** Auth and DB are dependencies of every feature. Wrong setup here cascades.
- **Phase 2 before 3 and 4:** Live recording exercises the full pipeline and validates it before the more complex flows are built. SSE infrastructure from Phase 2 is reused in Phase 3.
- **Phase 3 before 4:** File upload requires solving the Vercel body limit constraint, which has the highest architectural risk. Better to discover Vercel Blob integration issues here than late in the project.
- **Phase 4 last among feature phases:** Realtime is architecturally isolated and depends on session persistence (Phase 1) being stable. It can ship independently without affecting Phase 2/3.
- **Phase 5 last:** Polish assumes all features exist. Icelandic QA requires all AI output paths to be built.

### Research Flags

**Needs deeper research before implementation:**
- **Phase 3 (File Upload):** Vercel Blob integration — browser-side direct upload, signed URL generation, and the exact API shape for receiving upload completion in the Next.js route. Verify against current Vercel Blob docs.
- **Phase 4 (GPT Realtime):** OpenAI Realtime ephemeral token endpoint and WebSocket connection URL — these details may have changed since training data cutoff (Aug 2025). Verify against current OpenAI platform docs before building `RealtimeClient.tsx`.

**Standard patterns (skip research-phase):**
- **Phase 1 (Foundation):** Clerk + Next.js middleware, Neon + Drizzle setup, and env var configuration are well-documented with stable patterns.
- **Phase 2 (Live Recording):** MediaRecorder + chunked POST + SSE is a standard browser/server pattern. Whisper + GPT-4o via SDK is well-documented.
- **Phase 5 (Polish):** shadcn/ui components, Vercel deployment, and environment variable setup are standard.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | Core patterns are HIGH confidence; exact package versions are LOW confidence and must be verified before scaffolding. Tailwind v4 is the most uncertain — fall back to v3 if Next.js 15 compatibility issues arise. |
| Features | MEDIUM-HIGH | Table stakes and differentiators validated against the working existing codebase. Anti-features derive from PROJECT.md decisions — HIGH confidence. Web search unavailable; market comparison is training-data only. |
| Architecture | HIGH | Derived directly from the working production codebase (CONCERNS.md, existing ARCHITECTURE.md). All three recording flows are implemented and running. The rewrite simplifies without changing flows. |
| Pitfalls | HIGH | Critical pitfalls #1, #2, #8, #14 are from Vercel's verified documentation. Pitfalls #7 and #14 (empty catch blocks, in-memory state) are from direct codebase evidence. Only Whisper file size behavior is MEDIUM (training data, not live-verified). |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Package versions:** All package versions in STACK.md are training-data estimates. Run `npm show [pkg] version` for all seven core packages before scaffolding. Do not pin to the versions in STACK.md without verifying.
- **Vercel Blob API shape:** The exact API for browser-side direct upload and signed URL generation was not sourced from live docs. Verify before Phase 3 begins.
- **OpenAI Realtime endpoint:** The ephemeral token endpoint (`POST /v1/realtime/sessions`) and WebSocket URL may have changed. The existing codebase has a working implementation — check it for the current endpoint before Phase 4.
- **Whisper `gpt-4o-transcribe` model:** ARCHITECTURE.md references `gpt-4o-transcribe` as the transcription model; STACK.md references `whisper-1`. The correct model name should be confirmed against current OpenAI API reference before the transcription pipeline is built.
- **Tailwind v4 with Next.js 15:** CSS-native config in Tailwind v4 is a breaking change from v3. If integration issues arise during scaffold, pin to Tailwind v3 — this is a documented fallback in STACK.md.
- **Vercel function timeout limits on current plan:** Confirm whether the target Vercel account is Hobby (300s max) or Pro (800s max). This determines whether a background job pattern is required for large file processing or if synchronous processing within `maxDuration = 300` is sufficient.

---

## Sources

### Primary (HIGH confidence — verified docs or direct codebase evidence)
- `/Users/ragnaragustsson/Documents/GitHub/Handriti/.planning/PROJECT.md` — requirements, constraints, key decisions
- `/Users/ragnaragustsson/Documents/GitHub/Handriti/.planning/codebase/ARCHITECTURE.md` — existing data flows, feature inventory (working production code)
- `/Users/ragnaragustsson/Documents/GitHub/Handriti/.planning/codebase/INTEGRATIONS.md` — existing integration audit
- `/Users/ragnaragustsson/Documents/GitHub/Handriti/.planning/codebase/CONCERNS.md` — known bugs, anti-patterns from real code
- Vercel docs (verified): 4.5 MB body limit, 500 MB /tmp, 300s max duration, file descriptor limits, memory limits
- OpenAI Realtime ephemeral token pattern: implemented and working in original codebase

### Secondary (MEDIUM confidence — training data, pre-Aug 2025)
- Next.js 15 App Router patterns (training data, stable since Oct 2024)
- Clerk v6 `clerkMiddleware()` pattern (training data — verify current major version)
- Neon serverless driver HTTP-mode connection pattern (training data — documented pattern)
- Drizzle ORM `drizzle(neon(url))` canonical setup (training data)
- OpenAI SDK v4 streaming + error handling patterns (training data)
- Whisper `language: 'is'` parameter and 25 MB limit (training data + API surface)
- Market feature comparison: Otter.ai, Fireflies.ai, Granola (training data, Aug 2025 cutoff)

### Tertiary (LOW confidence — needs verification before coding)
- Exact package version numbers for all dependencies (STACK.md — verify with npm)
- Tailwind CSS v4 behavior with Next.js 15 (training data + known breaking changes)
- Current Vercel Blob API shape for browser-direct upload (not verified against live docs)
- Current OpenAI Realtime WebSocket URL and ephemeral token endpoint format

---
*Research completed: 2026-02-28*
*Ready for roadmap: yes*
