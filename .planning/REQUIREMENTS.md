# Requirements: Handriti

**Defined:** 2026-02-28
**Core Value:** Icelandic speakers can record or upload audio and get accurate transcripts and useful, structured summaries — reliably, with no setup required.

## v1 Requirements

Requirements for the full rewrite. Every item here existed in the original app and must be preserved, or is a direct rewrite constraint from PROJECT.md.

### Setup

- [ ] **SETUP-01**: Next.js 15 App Router project is scaffolded with TypeScript, Tailwind CSS, and Node.js runtime enforced on all AI/audio routes
- [ ] **SETUP-02**: Clerk auth is configured with `clerkMiddleware()` protecting all `/api/*` routes and a shared `requireAuth()` utility used in every handler
- [ ] **SETUP-03**: Neon Postgres is connected via `@neondatabase/serverless` HTTP driver with Drizzle ORM; schema tables (`sessions`, `chunks`, `notes`) exist and migrations run in the Vercel build step
- [ ] **SETUP-04**: Environment variables are validated at startup via `lib/env.ts`; `NEXT_PUBLIC_` prefix rules are enforced and documented

### Pipeline

- [ ] **PIPE-01**: Whisper transcription pipeline (`lib/pipeline/transcribe.ts`) sends audio with `language: 'is'` and passes prior chunk transcript as context prompt
- [ ] **PIPE-02**: GPT-4o summarization pipeline (`lib/pipeline/summarize.ts`) produces structured notes and rolling summary; every prompt includes an explicit Icelandic instruction
- [ ] **PIPE-03**: Icelandic prompt constants are centralised in `lib/pipeline/prompts.ts`; no language instructions are inlined in route handlers

### Recording

- [ ] **REC-01**: User can start and stop a live recording session from the browser using MediaRecorder (works on mobile Safari and Chrome)
- [ ] **REC-02**: Each 10-second audio chunk is sent to `/api/chunk`, transcribed by Whisper, and a note is written to the database; each chunk has a `status` field (`pending`/`processing`/`done`/`failed`) and failures are logged with context
- [ ] **REC-03**: User sees real-time transcription notes appearing during recording via SSE stream (`/api/stream` polling Neon every 300 ms)
- [ ] **REC-04**: User can select a session profile (meeting, lecture, interview, casual) before recording; the selection drives prompt construction in the pipeline
- [ ] **REC-05**: User sees a rolling summary updating during recording alongside the notes

### Sessions

- [ ] **SESS-01**: Session is created in Neon at recording start and finalised (final summary generated) when the user stops recording
- [ ] **SESS-02**: User can view a list of their past sessions on the home dashboard, ordered by most recent
- [ ] **SESS-03**: User can open a session detail page showing the full transcript, structured notes, and final summary
- [ ] **SESS-04**: User can rename a session from the session detail page (single `title` field, inline edit)

### Upload

- [ ] **UPLOAD-01**: User can select an audio file (webm, mp3, mp4, m4a, wav) for upload; the file is sent directly from the browser to Vercel Blob (bypassing the Next.js API route body limit); the API route receives only the storage URL
- [ ] **UPLOAD-02**: Server processes the uploaded file by fetching from Vercel Blob, splitting into segments under 25 MB, transcribing each segment via Whisper, and generating a final summary; processing runs within a single function invocation with `maxDuration = 300`
- [ ] **UPLOAD-03**: User sees progress feedback while the upload is processing and is redirected to the session detail page when complete

### Realtime

- [ ] **REAL-01**: Server issues a short-lived OpenAI ephemeral token (`POST /api/realtime`) after Clerk auth verification; the token is returned to the client and never stored server-side
- [ ] **REAL-02**: Client establishes a WebSocket directly to OpenAI using the ephemeral token; user can speak Icelandic and receive AI responses; transcript is accumulated client-side and saved to Neon via `POST /api/session` when the session ends

### Polish

- [ ] **POLS-01**: Every transcript, notes block, and summary has a one-click copy button
- [ ] **POLS-02**: All user-facing error states (chunk failure, upload timeout, Whisper rejection, auth error) display a clear Icelandic-language message rather than a raw error or blank screen
- [ ] **POLS-03**: A full Icelandic language QA pass confirms that every GPT-4o output path produces Icelandic output; every Whisper call passes `language: 'is'`
- [ ] **POLS-04**: App is deployed to Vercel with all required environment variables documented in `.env.example`; unauthenticated access to all API routes is verified to return 401

## v2 Requirements

Deferred. Acknowledged but not in the current roadmap.

### Discovery

- **DISC-01**: User can search past sessions by keyword across transcript text
- **DISC-02**: User can export a session as plain text or markdown file
- **DISC-03**: User can share a session via a public read-only link

### Enhancement

- **ENH-01**: Session profiles include Icelandic domain vocabulary hints (legal, medical, educational) injected into Whisper prompts
- **ENH-02**: Interview profile triggers speaker-aware prompt framing (two-speaker context hint)
- **ENH-03**: Auto-stop recording on prolonged silence (client-side VAD or silence threshold)

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Credit / payment system | Stripe complexity out of scope; launch free |
| Email delivery (Resend) | Not core; users copy-paste what they need |
| Push notifications | Service worker + VAPID complexity for low value |
| Client-side FFmpeg | Breaks COOP/COEP headers required by Clerk auth popups; 30 MB bundle |
| Team workspaces | Single-user scope for v1 |
| Calendar / CRM integrations | Separate product scope |
| Custom AI model selection | Always use best-available model internally |
| Offline mode / PWA | Network required; browser tab must stay open |
| Audio playback with transcript | Timestamps + waveform UI is significant frontend work |
| Multi-language support | Icelandic only for v1 |
| Admin dashboard / analytics | Use Vercel logs + Neon console |
| Speaker diarization (true) | Requires pyannote or AssemblyAI — not in OpenAI SDK |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 | Phase 1 | Pending |
| SETUP-02 | Phase 1 | Pending |
| SETUP-03 | Phase 1 | Pending |
| SETUP-04 | Phase 1 | Pending |
| PIPE-01 | Phase 1 | Pending |
| PIPE-02 | Phase 1 | Pending |
| PIPE-03 | Phase 1 | Pending |
| REC-01 | Phase 2 | Pending |
| REC-02 | Phase 2 | Pending |
| REC-03 | Phase 2 | Pending |
| REC-04 | Phase 2 | Pending |
| REC-05 | Phase 2 | Pending |
| SESS-01 | Phase 2 | Pending |
| SESS-02 | Phase 2 | Pending |
| SESS-03 | Phase 2 | Pending |
| SESS-04 | Phase 2 | Pending |
| UPLOAD-01 | Phase 3 | Pending |
| UPLOAD-02 | Phase 3 | Pending |
| UPLOAD-03 | Phase 3 | Pending |
| REAL-01 | Phase 4 | Pending |
| REAL-02 | Phase 4 | Pending |
| POLS-01 | Phase 5 | Pending |
| POLS-02 | Phase 5 | Pending |
| POLS-03 | Phase 5 | Pending |
| POLS-04 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 25 total
- Mapped to phases: 25
- Unmapped: 0 ✓

---
*Requirements defined: 2026-02-28*
*Last updated: 2026-02-28 after initial roadmap creation*
