# Architecture Patterns

**Domain:** Icelandic audio transcription and summarization web app
**Researched:** 2026-02-28
**Confidence:** HIGH (derived from existing working codebase + known constraints of target stack)

---

## Recommended Architecture

The rewrite targets Next.js 15 App Router running on Vercel, with Clerk for auth, Neon+Drizzle for data, and the OpenAI Node SDK for all AI calls. Three distinct recording flows share a common session/pipeline layer but differ in how audio reaches OpenAI.

### High-Level Component Map

```
Browser
  │
  ├─── MediaRecorder (live chunks) ──────────────────────────────┐
  ├─── File <input> (upload) ─────────────────────────────────── │
  └─── WebSocket (GPT Realtime) ──────────────────────────────── │
                                                                  │
Next.js App Router (Vercel serverless / Node runtime)            │
  │                                                              │
  ├─── app/api/chunk/route.ts       ◄──────── live chunks ◄──────┘
  ├─── app/api/upload/route.ts      ◄──────── file upload
  ├─── app/api/realtime/route.ts    ◄──────── ephemeral token req
  ├─── app/api/stream/route.ts      ────────► SSE to browser
  └─── app/api/session/route.ts     ────────► CRUD

lib/pipeline/
  ├─── transcribe.ts    (OpenAI Whisper via SDK)
  ├─── summarize.ts     (GPT-4o via SDK, Icelandic)
  ├─── processChunk.ts  (orchestrates transcribe → summarize → db)
  └─── prompts.ts       (profile-aware prompt builders)

lib/db/
  ├─── schema.ts        (Drizzle table definitions)
  ├─── sessions.ts      (session CRUD)
  ├─── chunks.ts        (chunk CRUD)
  └─── users.ts         (user profile CRUD)

Neon Postgres (serverless, connection pooling built-in)
OpenAI API (Whisper + GPT-4o + Realtime)
Clerk (auth, JWT verification in middleware)
```

---

## Component Boundaries

| Component | Responsibility | Input | Output | Communicates With |
|-----------|---------------|-------|--------|-------------------|
| `app/api/chunk/route.ts` | Receive live audio blob, transcribe, enqueue pipeline | `FormData` with audio blob + sessionId | `{transcript, seq}` JSON | `lib/pipeline/transcribe`, `lib/pipeline/processChunk`, Neon |
| `app/api/upload/route.ts` | Accept large file, split server-side, transcribe all segments, run full pipeline | `FormData` with audio file | streaming progress or final `{sessionId}` | `lib/pipeline/transcribe`, `lib/pipeline/processChunk`, Neon |
| `app/api/realtime/route.ts` | Create ephemeral OpenAI Realtime token, return to client | Clerk JWT | `{client_secret}` | OpenAI Realtime Sessions API |
| `app/api/stream/route.ts` | Poll Neon for new chunks/summaries, emit SSE | `?sessionId` query param | SSE stream: `note`, `summary` events | Neon (read-only polling) |
| `app/api/session/route.ts` | Create/read/update session records | Clerk JWT + JSON body | Session metadata | Neon via `lib/db/sessions` |
| `lib/pipeline/transcribe.ts` | Call OpenAI Whisper with Icelandic hints | `Buffer` or `ReadableStream` | `string` transcript | OpenAI SDK |
| `lib/pipeline/summarize.ts` | Call GPT-4o for rolling notes + final summary | Transcript context + profile | Structured JSON (notes, summary) | OpenAI SDK |
| `lib/pipeline/processChunk.ts` | Orchestrate transcribe → summarize → persist | Chunk input params | Persisted note + updated rolling summary | `transcribe`, `summarize`, `lib/db` |
| `lib/db/schema.ts` | Drizzle table definitions | — | — | All db modules |
| `middleware.ts` | Clerk auth guard on all API routes | Request | Auth context or 401 | Clerk SDK |
| `RecordClient.tsx` | UI: live recording, sends chunks, renders SSE stream | User interaction | Audio blobs to `/api/chunk`, reads `/api/stream` | Browser MediaRecorder API |
| `UploadClient.tsx` | UI: file picker, progress display | User file selection | File to `/api/upload`, reads progress | Fetch API |
| `RealtimeClient.tsx` | UI: GPT Realtime session, WebSocket to OpenAI | Button press | Direct WebSocket to OpenAI | OpenAI Realtime (client-side) |
| `ResultsPage` (server component) | Display session transcript, notes, summary | `sessionId` param | Rendered HTML | `lib/db/sessions`, `lib/db/chunks` |

**Strict boundary rules:**
- No Drizzle imports in client components. All DB access goes through API routes.
- No OpenAI SDK imports in client components. API routes are the only callers.
- `lib/db/*` is server-only (never exported to client bundle).
- Clerk's `auth()` is called once per request in `middleware.ts` — routes trust the forwarded user ID.

---

## Data Flow

### Flow 1: Live Recording (Chunked MediaRecorder)

```
1. User clicks "Record" in RecordClient.tsx
   └── Browser MediaRecorder starts, produces blobs every ~10s

2. Each blob → POST /api/chunk
   ├── Clerk middleware verifies JWT, attaches userId
   ├── Route reads FormData: {audio: Blob, sessionId, seq, promptProfile}
   ├── Calls lib/pipeline/transcribe.ts → OpenAI Whisper (gpt-4o-transcribe)
   │   └── Returns: string transcript
   ├── Calls lib/pipeline/processChunk.ts
   │   ├── Fetches recent chunk context from Neon (last 1-2 chunks)
   │   ├── Builds prompt via lib/pipeline/prompts.ts (profile-aware + Icelandic)
   │   ├── Calls lib/pipeline/summarize.ts → GPT-4o
   │   │   └── Returns: {notes: string[], summaryAddendum: string}
   │   └── Writes chunk + note + rolling summary to Neon
   └── Returns: {transcript, seq} to client (fast path)

3. RecordClient.tsx opens GET /api/stream?sessionId=X (SSE)
   └── Server polls Neon every 300ms for new messages/summary
       ├── Emits: event: note, data: {text, seq}
       └── Emits: event: summary, data: {text}

4. On "Stop": client calls POST /api/session/finalize
   └── Server fetches all chunks, builds final summary prompt
       └── GPT-4o → writes finalSummary to Neon session record
```

**Direction:** Browser → API route (POST) → OpenAI → Neon → SSE → Browser

### Flow 2: Large File Upload

```
1. User selects file in UploadClient.tsx
   └── POST /api/upload with file as FormData

2. Server route (Node.js runtime, NOT edge):
   ├── Validate file size/type
   ├── Read file into Buffer (or stream to temp location)
   ├── Split into segments server-side:
   │   Option A (v1, simpler): fixed-size byte slices if file < 25MB each
   │   Option B (v1+): use music-metadata to detect duration, slice by time
   │   Note: No FFmpeg in v1 — accept size limits or simple byte slicing
   └── For each segment (sequential, not parallel — Vercel function timeout risk):
       ├── transcribe.ts → Whisper
       ├── processChunk.ts → GPT-4o notes
       └── Write to Neon

3. After all segments:
   └── POST /api/session/finalize → final summary → Neon

4. Client polls /api/stream or receives final {sessionId} redirect
```

**Direction:** Browser → API route (large POST) → Segment loop → OpenAI (per segment) → Neon → Client redirect

**Key constraint:** Vercel serverless functions have a 60s default timeout. For long audio files, this means either:
- Accept a 25MB upload limit in v1 (approximately 15-30 minutes of audio depending on quality)
- Use Vercel's `maxDuration` config (up to 800s on Pro) for the upload route
- Stream progress back via SSE while processing (harder but better UX)

Recommended v1 approach: Set `export const maxDuration = 300` on the upload route, impose a 100MB client-side limit, use simple Buffer splitting without FFmpeg.

### Flow 3: GPT Realtime (WebSocket)

```
1. User clicks "Start Realtime" in RealtimeClient.tsx
   └── POST /api/realtime → Server creates ephemeral token from OpenAI

2. Server:
   ├── Clerk verifies user
   ├── Calls OpenAI: POST https://api.openai.com/v1/realtime/sessions
   │   with model: "gpt-4o-realtime-preview"
   └── Returns: {client_secret: {value: "..."}} to client

3. Client uses client_secret to open WebSocket directly to OpenAI:
   └── wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview

4. Browser sends audio frames via WebSocket, receives transcription + audio response
   └── No server proxy involved after token issuance

5. Client accumulates transcript locally
   └── On session end: POST /api/session with full transcript → Neon storage
```

**Direction:** Browser → API route (ephemeral token only) → Browser ↔ OpenAI WebSocket (direct)

**Key architectural decision:** The server is NOT a WebSocket proxy. It only issues ephemeral tokens. All realtime traffic goes directly browser-to-OpenAI. This sidesteps Vercel's lack of persistent WebSocket support entirely.

### Flow 4: SSE Streaming (shared infrastructure)

```
GET /api/stream?sessionId=X
├── Server verifies sessionId belongs to authenticated user (Clerk userId check)
├── Sets headers: Content-Type: text/event-stream, Cache-Control: no-cache
├── Opens Neon connection (read-only query)
└── Poll loop (setInterval or recursive setTimeout):
    ├── SELECT new chunks/notes/summary since lastSeq
    ├── if data: write SSE frame → flush
    └── On client disconnect: clearInterval, close Neon connection

Client (RecordClient.tsx):
└── const evtSource = new EventSource('/api/stream?sessionId=X')
    ├── evtSource.addEventListener('note', handler)
    └── evtSource.addEventListener('summary', handler)
```

**Polling interval:** 300-500ms is appropriate. Original used 100ms — that's aggressive and creates unnecessary DB load. 300ms is imperceptible to users for this UX.

---

## Patterns to Follow

### Pattern 1: Route → Pipeline → DB (never skip layers)

Every API route delegates to `lib/pipeline/` functions. Routes handle HTTP concerns (auth, request parsing, response format). Pipeline functions handle business logic. DB modules handle persistence. No route writes to Neon directly.

```typescript
// app/api/chunk/route.ts
export async function POST(req: Request) {
  const { userId } = auth()           // Clerk — HTTP concern
  const formData = await req.formData() // HTTP concern
  const audio = formData.get('audio') as Blob

  const transcript = await transcribeChunk(audio)  // pipeline
  const result = await processChunk({              // pipeline
    userId, sessionId, seq, transcript, promptProfile
  })

  return Response.json({ transcript, seq })  // HTTP concern
}
```

### Pattern 2: Server-only Drizzle client singleton

```typescript
// lib/db/client.ts
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql)
```

Never instantiate Drizzle in route handlers. Import from `lib/db/client.ts`. Neon's serverless driver handles connection pooling — no pgBouncer needed.

### Pattern 3: Icelandic language in all prompts

Every prompt builder in `lib/pipeline/prompts.ts` includes an explicit Icelandic instruction. This is a constraint that must survive every prompt refactor.

```typescript
const ICELANDIC_INSTRUCTION = `
Þú ert Íslenskur ritar. Öll svör skulu vera á íslensku.
Notaðu formlegt málstak og réttar setningafræðireglur.
` as const
```

### Pattern 4: Minimal server state (no in-memory caches)

The original codebase has a global `webmHeaderCache` Map that accumulates unboundedly. In the rewrite: no module-level mutable state. Vercel functions are ephemeral anyway — caches evaporate between cold starts. State lives in Neon.

### Pattern 5: FormData for audio blobs, JSON for everything else

Audio routes accept `multipart/form-data` (the only way to send binary blobs from browsers). All non-audio routes use `application/json`. Never mix.

### Pattern 6: Node.js runtime for audio routes, default for everything else

```typescript
// app/api/upload/route.ts
export const runtime = 'nodejs'       // needs Buffer, larger memory, 300s timeout
export const maxDuration = 300        // Vercel Pro: up to 800s

// app/api/realtime/route.ts
// no runtime declaration = default (Node.js, but fast path)
```

Do NOT use `edge` runtime for any audio processing route. Edge runtime has no Buffer, no file I/O, and strict size limits.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: WebM Binary Manipulation

**What:** The original codebase has 300+ lines of manual EBML/WebM header parsing to stitch MediaRecorder chunks together (inject SPS headers, rewrite timecodes).

**Why bad:** It's complex, browser-specific, fragile across Chrome/Firefox/Safari versions, and the primary source of silent transcription failures in the original.

**Instead:** Send each chunk to Whisper independently. Modern `gpt-4o-transcribe` handles headerless WebM fragments if they contain audio data. If Whisper rejects a chunk, retry as WAV by re-encoding in the browser using AudioContext + AudioWorklet (simpler than server-side EBML manipulation). Pass the previous chunk's transcript as a context hint to Whisper's `prompt` parameter to maintain continuity.

### Anti-Pattern 2: In-memory job queue

**What:** The original uses a module-level `jobQueue.ts` with a Promise chain to serialize chunk processing. On server restart, all queued work is lost.

**Why bad:** Vercel functions are ephemeral. A cold start mid-session means queued chunks disappear silently.

**Instead:** For v1, process chunks synchronously in the POST handler (await transcribe + await processChunk before returning). The client already waits for a response per chunk. For v2, if throughput demands it, use Vercel's Queue or a simple Neon-backed task table.

### Anti-Pattern 3: Credit system in v1

**What:** The original has a credit/seconds-remaining system with consumption, refunds, race conditions, and multiple sources of truth.

**Why bad:** It's the most complex and bug-prone part of the codebase. Out of scope for this rewrite.

**Instead:** No credits in v1. Users get unlimited use. Add monetization in a later phase with a clean Stripe integration.

### Anti-Pattern 4: Global supabase service client

**What:** Original initializes a singleton service-role Supabase client at module level, shared across all requests.

**Why bad:** With Drizzle + Neon, this pattern is unnecessary and potentially unsafe with connection state.

**Instead:** Drizzle's `neon()` connection is connection-pooled by Neon's serverless driver. The `db` export from `lib/db/client.ts` is a stateless query builder. No singleton concerns.

### Anti-Pattern 5: Client-side FFmpeg

**What:** Original bundles `@ffmpeg/ffmpeg` (WASM, ~30MB) and runs audio transcoding in the browser.

**Why bad:** Massive bundle size, complex initialization, fails on low-memory mobile devices, and adds a fragile WASM dependency.

**Instead:** Accept audio in whatever format the browser's MediaRecorder produces (typically WebM/Opus on Chrome, WebM/Opus on Firefox, MP4/AAC on Safari). Whisper accepts all three. For uploads, set a file size limit (100MB) and handle as-is without transcoding.

---

## Build Order

The three recording flows share infrastructure. Build in dependency order:

### Stage 1: Foundation (everything else depends on this)

1. **Drizzle schema** (`lib/db/schema.ts`) — define `users`, `sessions`, `chunks`, `notes` tables
2. **Neon migration** — push schema to dev database
3. **Clerk middleware** (`middleware.ts`) — protect all `/api/*` routes
4. **DB modules** (`lib/db/sessions.ts`, `lib/db/chunks.ts`, `lib/db/users.ts`) — CRUD functions
5. **OpenAI SDK client** (`lib/openai.ts`) — typed client instance
6. **Transcription** (`lib/pipeline/transcribe.ts`) — Whisper call with Icelandic prompt
7. **Summarization** (`lib/pipeline/summarize.ts`) — GPT-4o call with profile-aware prompts
8. **Process chunk** (`lib/pipeline/processChunk.ts`) — orchestrate transcribe → summarize → db

**Gate:** Can transcribe a .webm blob and see a note row appear in Neon.

### Stage 2: Live Recording Flow (highest-value feature)

1. **Session creation API** (`app/api/session/route.ts`) — POST creates session, GET fetches it
2. **Chunk upload API** (`app/api/chunk/route.ts`) — receives blob, runs processChunk pipeline
3. **SSE stream API** (`app/api/stream/route.ts`) — polls Neon, emits note/summary events
4. **RecordClient component** — MediaRecorder, chunk sender, SSE consumer
5. **Results page** (`app/results/[sessionId]/page.tsx`) — server component, reads Neon

**Gate:** Can record, see real-time notes appear, stop recording, view results page.

### Stage 3: File Upload Flow

1. **Upload API** (`app/api/upload/route.ts`) — receives file, splits, runs pipeline per segment
2. **UploadClient component** — file picker, progress indicator
3. **Finalize API** (`app/api/session/finalize/route.ts`) — builds final summary from all chunks

**Gate:** Can upload an MP3, wait, and see a full transcript + summary on results page.

### Stage 4: GPT Realtime Flow

1. **Realtime token API** (`app/api/realtime/route.ts`) — issues ephemeral OpenAI token
2. **RealtimeClient component** — WebSocket management, audio capture, transcript display
3. **Session save** — POST transcript to `/api/session` at end of session

**Gate:** Can start a Realtime session, speak Icelandic, see AI responses, save the session.

### Stage 5: Polish

1. Session list / home dashboard
2. Prompt profile selector UI
3. Icelandic language QA pass (verify all AI output is in Icelandic)
4. Error boundaries and user-facing error messages
5. Vercel deployment + environment variable documentation

---

## Scalability Considerations

| Concern | At 50 users | At 1K users | At 10K users |
|---------|-------------|-------------|--------------|
| Neon connections | Fine — serverless pooling handles it | Fine | May need pgBouncer or Neon's connection pooler explicitly configured |
| Vercel function concurrency | Fine — each chunk is a short-lived function | Fine | May hit function concurrency limits on Hobby plan |
| SSE polling load | 50 open SSE connections × 300ms polls = manageable | Scale SSE poll interval to 500ms, or switch to Vercel's streaming response | Consider webhook/push pattern instead of polling |
| OpenAI rate limits | Fine | May hit TPM limits — add retry with backoff | Need OpenAI org tier with higher limits |
| Upload function timeout | 300s sufficient for 100MB files | Enforce size limits strictly | Consider background job queue |

---

## Environment Variables (target stack)

```
# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...

# Database
DATABASE_URL=...         # Neon connection string (includes ?sslmode=require)

# OpenAI
OPENAI_API_KEY=...
OPENAI_TRANSCRIBE_MODEL=gpt-4o-transcribe
OPENAI_NOTES_MODEL=gpt-4o-mini
OPENAI_SUMMARY_MODEL=gpt-4o

# Upload limits
NEXT_PUBLIC_MAX_UPLOAD_MB=100
MAX_UPLOAD_MB=100

# Feature flags
CHUNK_CONTEXT_PREVIOUS=2   # how many prior chunk transcripts to pass as Whisper prompt
```

Dropped from original: all Supabase vars, RESEND, WEB_PUSH, VALITOR, FFMPEG_PATH, all segment strategy vars.

---

## Sources

- Existing codebase analysis: `/Users/ragnaragustsson/Documents/GitHub/Handriti/.planning/codebase/ARCHITECTURE.md` (HIGH confidence — working production code)
- Existing integration audit: `/Users/ragnaragustsson/Documents/GitHub/Handriti/.planning/codebase/INTEGRATIONS.md` (HIGH confidence)
- Existing concerns audit: `/Users/ragnaragustsson/Documents/GitHub/Handriti/.planning/codebase/CONCERNS.md` (HIGH confidence — known bugs from real code)
- Vercel serverless function limits: maxDuration up to 800s on Pro, 60s on Hobby (MEDIUM confidence — verify current limits at deployment time)
- OpenAI Realtime API ephemeral token pattern: `POST /v1/realtime/sessions` → client_secret → direct WebSocket (HIGH confidence — implemented and working in original codebase)
- Neon serverless driver: connection pooling built-in via `@neondatabase/serverless` + `neon()` (HIGH confidence — documented pattern)
- Whisper `prompt` parameter for context continuity: supported in gpt-4o-transcribe (HIGH confidence — documented in OpenAI API reference)
