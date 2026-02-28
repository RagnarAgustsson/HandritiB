# Architecture

**Analysis Date:** 2026-02-28

## Pattern Overview

**Overall:** Next.js 14 full-stack application with server and edge runtimes, implementing a real-time audio transcription and summarization pipeline for Icelandic speech.

**Key Characteristics:**
- Server-Side Rendering (SSR) with auth-guarded layouts
- Edge runtime for stateless operations (realtime sessions, summary generation)
- Node.js runtime for long-running processes (large audio uploads, FFmpeg processing)
- Client-side streaming (SSE for real-time notes/summary updates)
- Supabase for authentication and data persistence
- OpenAI API integration for transcription and GPT-based summarization
- Multi-profile prompt system (meeting, lecture, interview, casual)

## Layers

**Presentation Layer:**
- Purpose: Server-rendered pages and client components handling UI interactions
- Location: `app/` (Next.js App Router)
- Contains: Pages (`page.tsx`), client components (`*Client.tsx`), reusable UI components
- Depends on: Auth context, Supabase client, API routes
- Used by: End users via HTTP

**API Layer:**
- Purpose: HTTP endpoints handling core business logic
- Location: `app/api/`
- Contains: Route handlers implementing POST/GET endpoints
- Depends on: Pipeline layer, Supabase service client, OpenAI API
- Used by: Client components, external services

**Pipeline/Processing Layer:**
- Purpose: Core transcription, summarization, and notes extraction
- Location: `lib/pipeline/`
- Contains: Chunk processing, prompt building, database persistence, job queuing
- Depends on: OpenAI API, Supabase, utilities
- Used by: API routes, large upload handler

**Data Access Layer:**
- Purpose: Database operations and Supabase client management
- Location: `lib/supabase/`, `lib/pipeline/db.ts`
- Contains: Supabase client initialization, profile management, session/chunk/message CRUD
- Depends on: Supabase SDK
- Used by: Pipeline layer, auth system

**Utility/Integration Layer:**
- Purpose: External service integrations and helper functions
- Location: `lib/` (openai.ts, transcription.ts, audio/, valitor.ts, push.ts, etc.)
- Contains: OpenAI chat/transcription clients, audio processing, payment gateway, notifications
- Depends on: External APIs, Node.js built-ins
- Used by: Pipeline and API layers

## Data Flow

**Recording Flow (Chunked Upload):**

1. User opens `/record` page → Server fetches profile, client initializes recorder
2. Client records audio in chunks → Browser BufferSource → `upload-audio-chunk` API
3. Route transcribes chunk → Calls `transcribeAudioChunk()` → OpenAI Whisper
4. Transcript stored in DB → Enqueues `processChunk()` task
5. Pipeline processes → Gets recent context → Builds prompt → Calls `chatCompletionJson()`
6. Claude returns JSON (notes, summary addendum) → Stored in DB
7. Client streams updates via `/api/stream` (SSE) → Polls for new messages and rolling summary
8. User views results at `/results/[sessionId]` → Server fetches session + chunks from DB

**Large File Upload Flow:**

1. User selects file at `/capture` or `/upload` → Client calls `large-audio-upload` API
2. Server uses FFmpeg to split file into segments → Validates each segment size
3. For each segment:
   - Transcribe via OpenAI Whisper
   - Consume credits from user account
   - Process chunk through pipeline
   - Update DB with progress
4. Final summary generation → Builds composite prompt from all chunks
5. Results viewable at `/results/[sessionId]`

**Real-Time Transcription Flow (GPT Realtime):**

1. Client POST `/api/realtime` → Gets ephemeral session from OpenAI
2. Client establishes WebSocket to OpenAI gpt-realtime endpoint
3. Client streams audio → OpenAI transcribes and responds with audio
4. Server-side VAD (Voice Activity Detection) enabled for accuracy
5. Full conversation history available for context

**Streaming Results Flow:**

1. Client GET `/api/stream?sessionId=xyz` → Server initializes SSE connection
2. Server polls DB every `STREAM_POLL_INTERVAL_MS` (100ms)
3. Emits `type: 'note'` when new assistant message found
4. Emits `type: 'summary'` when rolling summary updated
5. Client renders updates in real-time without full page refresh

## Key Abstractions

**ProcessChunkInput/Result:**
- Purpose: Encapsulate chunk processing parameters and outputs
- Examples: `lib/pipeline/processChunk.ts` (lines 22-36)
- Pattern: Request/response object pattern with optional fields for async flexibility

**PromptProfile:**
- Purpose: Control tone and output structure based on context type
- Examples: `lib/pipeline/promptProfile.ts` (separate file, referenced in prompts.ts)
- Pattern: Union type enum (`'meeting' | 'lecture' | 'interview' | 'casual'`) driving conditional logic in prompt builders

**ChunkContext:**
- Purpose: Represent recent transcript segments for rolling summarization
- Examples: `lib/pipeline/prompts.ts` (line 9-11)
- Pattern: Array of `{seq, transcript}` objects passed to LLM prompts for continuity

**ApiSuccess<T> / ApiError:**
- Purpose: Standardize API response envelopes
- Examples: `lib/api/types.ts`
- Pattern: Discriminated union with `ok: boolean` flag

**UploadTask Queue:**
- Purpose: Serialize chunk uploads and retries for network resilience
- Examples: `lib/client/fileChunker.ts`, `lib/pipeline/uploader.ts`
- Pattern: Promise chaining with backoff retry logic

## Entry Points

**Server Entry Point:**
- Location: `app/layout.tsx`
- Triggers: Every HTTP request to app
- Responsibilities:
  - Authenticate user via Supabase
  - Load profile and check admin access
  - Apply maintenance mode check
  - Wrap children with AuthProvider

**Recording Page:**
- Location: `app/record/page.tsx` → `app/record/RecordClient.tsx`
- Triggers: User navigates to `/record`
- Responsibilities:
  - Fetch user's remaining seconds
  - Initialize WebRTC MediaRecorder
  - Upload chunks to `/api/upload-audio-chunk`
  - Stream results via `/api/stream` SSE

**Capture Page (Large Files):**
- Location: `app/capture/page.tsx` → `app/capture/UnifiedCaptureClient.tsx`
- Triggers: User navigates to `/capture`
- Responsibilities:
  - Handle file selection
  - Split file via FFmpeg in `/api/large-audio-upload`
  - Track multi-segment progress

**API: audio-upload**
- Location: `app/api/audio-upload/route.ts`
- Triggers: Client POST with audio buffer and transcript (legacy)
- Responsibilities: Transcribe single audio file, calculate usage, persist to DB

**API: upload-audio-chunk**
- Location: `app/api/upload-audio-chunk/route.ts`
- Triggers: Client POST with audio blob from recorder
- Responsibilities:
  - Validate request auth
  - Transcribe chunk
  - Enqueue pipeline processing
  - Return transcript + credit consumption

**API: large-audio-upload**
- Location: `app/api/large-audio-upload/route.ts`
- Triggers: Client POST with file form data
- Responsibilities:
  - Write temp file to disk
  - Invoke FFmpeg adaptive splitting
  - Transcribe each segment
  - Process through full pipeline
  - Clean up temp files

**API: realtime**
- Location: `app/api/realtime/route.ts`
- Triggers: Client POST (edge runtime)
- Responsibilities: Proxy OpenAI realtime session creation

**API: stream**
- Location: `app/api/stream/route.ts`
- Triggers: Client GET with `sessionId` query param
- Responsibilities:
  - Poll Supabase for session updates
  - Emit SSE events for notes and summary changes
  - Manage connection lifecycle

**API: summary**
- Location: `app/api/summary/route.ts` (legacy)
- Triggers: Client POST with full transcript
- Responsibilities: Generate live summary via chat completion

**API: final-summary**
- Location: `app/api/final-summary/route.ts`
- Triggers: Client/server request to finalize session
- Responsibilities:
  - Build composite prompt from all chunks
  - Call Claude for final synthesis
  - Persist to DB

## Error Handling

**Strategy:** Graceful degradation with user-facing error messages and structured logging.

**Patterns:**
- Try/catch in async route handlers → `jsonError(message, statusCode)` responses
- Supabase errors checked via `error?.code` (e.g., 'PGRST116' = not found)
- Retry logic for transient network failures (`withRetry()` in `lib/utils/retry.ts`)
- Logger utility (`lib/logging.ts`) for structured logs with context
- Fallback responses: if summarization fails, return transcript as placeholder

**Example:**
```typescript
// lib/pipeline/processChunk.ts (lines 198-207)
try {
  combined = await chatCompletionJson<...>(prompt, {...});
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  logger.warn('[pipeline] combined summary failed', { sessionId, seq, error: message });
}
// Falls back to formatAssistantMessage() if combined is null
```

## Cross-Cutting Concerns

**Logging:**
- `lib/logging.ts` exports logger with `.info()`, `.warn()`, `.error()` methods
- Structured context passed as second argument
- Diagnostic logging in layout.tsx (lines 12-16) with phase tracking

**Validation:**
- Request body validation via `req.json()` with type checks
- Transcript length checks before processing
- Audio duration validation via `getAudioDurationSeconds()`
- PromptProfile validated via `isPromptProfile()` before use

**Authentication:**
- All user-facing routes call `fetchProfile()` → checks `supabase.auth.getUser()`
- AccessGate component (`app/components/AccessGate.tsx`) enforces access rights
- Admin status checked via `hasAdminAccess(profile)` in layout

**Credit System:**
- `lib/usage.ts` exports `consumeSeconds()` and `refundSeconds()`
- Called before and after transcription
- Blocks uploads if user has insufficient credits

**Icelandic Language:**
- Transcription prompts include Icelandic grammar rules (`ICELANDIC_LANGUAGE_RULES` in prompts.ts)
- Vocabulary hints per profile type
- System prompts explicitly request Icelandic output

---

*Architecture analysis: 2026-02-28*
