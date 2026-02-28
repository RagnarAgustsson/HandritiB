# Roadmap: Handriti

## Overview

Handriti is a full rewrite of a working Icelandic transcription tool, replacing Supabase + FFmpeg + raw fetch with Clerk + Neon + Drizzle + OpenAI SDK. The five phases follow strict dependency order: Foundation builds the shared skeleton all three recording flows attach to; Live Recording validates the full pipeline end-to-end; File Upload solves the Vercel body-limit constraint; GPT Realtime wires the isolated WebSocket flow; Polish and Deployment closes the loop with production-readiness. Every phase delivers a coherent, testable capability.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation + Auth + Database** - Scaffold, Clerk auth, Neon+Drizzle schema, and shared pipeline modules for transcription and summarization
- [ ] **Phase 2: Live Recording Flow** - End-to-end live recording with real-time transcription, rolling notes, session management, and results viewing
- [ ] **Phase 3: File Upload Flow** - Audio file upload via Vercel Blob, server-side segment processing, and session results
- [ ] **Phase 4: GPT Realtime Flow** - Ephemeral token issuance and client-direct WebSocket session with OpenAI Realtime
- [ ] **Phase 5: Polish + Deployment** - Copy buttons, error messages, Icelandic QA, and verified Vercel production deployment

## Phase Details

### Phase 1: Foundation + Auth + Database
**Goal**: The project skeleton exists — developers can authenticate, write to the database, and run audio through the transcription + summarization pipeline without touching any UI
**Depends on**: Nothing (first phase)
**Requirements**: SETUP-01, SETUP-02, SETUP-03, SETUP-04, PIPE-01, PIPE-02, PIPE-03
**Success Criteria** (what must be TRUE):
  1. A signed-in user can make an authenticated request to any `/api/*` route; an unauthenticated request to the same route returns 401
  2. Running a migration produces all required tables (`sessions`, `chunks`, `notes`) in Neon and the schema is readable via `drizzle-kit studio`
  3. A test script can POST a `.webm` audio blob to the transcription pipeline and see a transcript string returned in Icelandic
  4. A test script can pass that transcript to the summarization pipeline and see structured notes returned in Icelandic
  5. Every GPT-4o prompt in `lib/pipeline/prompts.ts` contains the Icelandic instruction constant; no prompt text is inlined in route handlers
**Plans**: TBD

### Phase 2: Live Recording Flow
**Goal**: Users can record live audio, watch real-time notes appear as they speak, stop the recording, and read the full transcript, notes, and final summary on the results page — with session history persisted and viewable
**Depends on**: Phase 1
**Requirements**: REC-01, REC-02, REC-03, REC-04, REC-05, SESS-01, SESS-02, SESS-03, SESS-04
**Success Criteria** (what must be TRUE):
  1. User can start and stop a recording session; the browser records audio via MediaRecorder on both desktop Chrome and mobile Safari
  2. During recording, transcription notes appear in the browser within a few seconds of each 10-second chunk completing; any chunk that fails to transcribe shows a visible error indicator rather than silently disappearing
  3. A rolling summary updates in the browser as recording continues; it reflects the session profile (meeting, lecture, interview, or casual) selected before recording
  4. After stopping, the user is taken to a results page showing the full transcript, all notes, and a final summary — all in Icelandic
  5. The home dashboard lists all of the user's past sessions by date; the user can rename any session from the detail page
**Plans**: TBD

### Phase 3: File Upload Flow
**Goal**: Users can upload a pre-recorded audio file and receive a full Icelandic transcript and final summary on the results page, with progress shown during processing
**Depends on**: Phase 2
**Requirements**: UPLOAD-01, UPLOAD-02, UPLOAD-03
**Success Criteria** (what must be TRUE):
  1. User can select an audio file (webm, mp3, mp4, m4a, wav) and upload it; the file never passes through a Next.js API route body — it goes directly to Vercel Blob
  2. After upload completes, the server fetches the file from storage, splits it into segments under 25 MB, and transcribes each segment; a session with a full transcript and final summary appears in the database
  3. User sees a progress indicator during processing and is redirected to the session detail page when processing is complete
**Plans**: TBD

### Phase 4: GPT Realtime Flow
**Goal**: Users can start a GPT Realtime session, speak Icelandic directly to OpenAI over a client-side WebSocket, and have the completed session saved to their history
**Depends on**: Phase 1
**Requirements**: REAL-01, REAL-02
**Success Criteria** (what must be TRUE):
  1. Clicking "Start Realtime" triggers a server-side POST to OpenAI that returns an ephemeral token; the server never stores the token and the OpenAI API key is never exposed to the client
  2. The browser opens a WebSocket directly to OpenAI using the ephemeral token; the user can speak and receive AI responses without the Vercel function staying open
  3. When the user ends the Realtime session, the accumulated transcript is saved to Neon and appears in the session history list
**Plans**: TBD

### Phase 5: Polish + Deployment
**Goal**: The app is production-ready — all AI output is reliably in Icelandic, every failure state shows a useful message, and the app is deployed to Vercel with documented environment setup
**Depends on**: Phase 2, Phase 3, Phase 4
**Requirements**: POLS-01, POLS-02, POLS-03, POLS-04
**Success Criteria** (what must be TRUE):
  1. Every transcript, notes block, and summary panel has a working copy button that places the content on the clipboard
  2. Every known failure path (chunk transcription failure, upload timeout, file-too-large rejection, unauthenticated request) shows a clear Icelandic-language message to the user — no blank screens or raw error objects
  3. A manual QA pass confirms that all three recording flows (live, upload, realtime) produce Icelandic output; all Whisper calls pass `language: 'is'`; no English-language fallback occurs during normal operation
  4. The app is deployed and accessible on Vercel; `.env.example` lists every required variable; all API routes return 401 for unauthenticated requests in the production environment
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation + Auth + Database | 0/TBD | Not started | - |
| 2. Live Recording Flow | 0/TBD | Not started | - |
| 3. File Upload Flow | 0/TBD | Not started | - |
| 4. GPT Realtime Flow | 0/TBD | Not started | - |
| 5. Polish + Deployment | 0/TBD | Not started | - |
