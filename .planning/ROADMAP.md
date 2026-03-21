# Roadmap: Handriti

## Overview

M1 (Phases 1-5) shipped a working transcription tool: live recording, file upload, GPT Realtime, and Paddle subscriptions. M2 (Phases 6-12) transforms Handriti into a full meeting intelligence platform. The dependency chain is strict: infrastructure comes first (Phase 6, goes live immediately), then the STT and LLM layers (Phases 7-8), then the agent that consumes both (Phase 9), then the UX that surfaces the agent (Phase 10), then tiers and export (Phase 11), and finally cleanup that removes all v1 dead code after v2 is verified (Phase 12).

## Milestones

- ✅ **v1.0 — Foundation** - Phases 1-5 (shipped 2026-03)
- 🚧 **v2.0 — Meeting Intelligence Tool** - Phases 6-12 (in progress)

## Phases

<details>
<summary>✅ v1.0 Foundation (Phases 1-5) - SHIPPED 2026-03</summary>

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
**Plans**: Complete

### Phase 2: Live Recording Flow
**Goal**: Users can record live audio, watch real-time notes appear as they speak, stop the recording, and read the full transcript, notes, and final summary on the results page — with session history persisted and viewable
**Depends on**: Phase 1
**Requirements**: REC-01, REC-02, REC-03, REC-04, REC-05, SESS-01, SESS-02, SESS-03, SESS-04
**Success Criteria** (what must be TRUE):
  1. User can start and stop a recording session; the browser records audio via MediaRecorder on both desktop Chrome and mobile Safari
  2. During recording, transcription notes appear in the browser within a few seconds of each 10-second chunk completing; any chunk that fails to transcribe shows a visible error indicator rather than silently disappearing
  3. A rolling summary updates in the browser as recording continues; it reflects the session profile selected before recording
  4. After stopping, the user is taken to a results page showing the full transcript, all notes, and a final summary — all in Icelandic
  5. The home dashboard lists all of the user's past sessions by date; the user can rename any session from the detail page
**Plans**: Complete

### Phase 3: File Upload Flow
**Goal**: Users can upload a pre-recorded audio file and receive a full Icelandic transcript and final summary on the results page, with progress shown during processing
**Depends on**: Phase 2
**Requirements**: UPLOAD-01, UPLOAD-02, UPLOAD-03
**Success Criteria** (what must be TRUE):
  1. User can select an audio file (webm, mp3, mp4, m4a, wav) and upload it; the file never passes through a Next.js API route body — it goes directly to Vercel Blob
  2. After upload completes, the server fetches the file from storage, transcribes it, and a session with a full transcript and final summary appears in the database
  3. User sees a progress indicator during processing and is redirected to the session detail page when processing is complete
**Plans**: Complete

### Phase 4: GPT Realtime Flow
**Goal**: Users can start a GPT Realtime session, speak Icelandic directly to OpenAI over a client-side WebSocket, and have the completed session saved to their history
**Depends on**: Phase 1
**Requirements**: REAL-01, REAL-02
**Success Criteria** (what must be TRUE):
  1. Clicking "Start Realtime" triggers a server-side POST to OpenAI that returns an ephemeral token; the server never stores the token and the OpenAI API key is never exposed to the client
  2. The browser opens a WebSocket directly to OpenAI using the ephemeral token; the user can speak and receive AI responses without the Vercel function staying open
  3. When the user ends the Realtime session, the accumulated transcript is saved to Neon and appears in the session history list
**Plans**: Complete

### Phase 5: Polish + Deployment
**Goal**: The app is production-ready — all AI output is reliably in Icelandic, every failure state shows a useful message, and the app is deployed to Vercel with documented environment setup
**Depends on**: Phase 2, Phase 3, Phase 4
**Requirements**: POLS-01, POLS-02, POLS-03, POLS-04
**Success Criteria** (what must be TRUE):
  1. Every transcript, notes block, and summary panel has a working copy button that places the content on the clipboard
  2. Every known failure path shows a clear Icelandic-language message to the user — no blank screens or raw error objects
  3. A manual QA pass confirms that all three recording flows produce Icelandic output
  4. The app is deployed and accessible on Vercel; `.env.example` lists every required variable
**Plans**: Complete

</details>

---

### 🚧 v2.0 — Meeting Intelligence Tool (In Progress)

**Milestone Goal:** Migrate from a transcription-only tool to a full meeting intelligence platform with a backend agent, swappable STT/LLM models, agenda tracking, and tiered pricing.

#### Phase 6: Infrastructure + Maintenance Mode
**Goal**: The maintenance page is live in production and the FastAPI backend is deployed and reachable — giving a safe, reversible foundation for the entire v2 migration
**Depends on**: Phase 5
**Requirements**: INFRA-01, INFRA-02, INFRA-03, INFRA-04, INFRA-05
**Success Criteria** (what must be TRUE):
  1. Setting `MAINTENANCE_MODE=true` env var on Vercel shows the "Handriti er að fara í glowup" page to all visitors without a code deploy; unsetting it restores the app immediately
  2. `GET https://api.handriti.is/health` returns 200 with a JSON body from the Railway-deployed FastAPI service
  3. A Clerk-signed JWT sent from the Next.js frontend is accepted by the FastAPI backend — the same user identity is recognized on both services
  4. FastAPI can read from the Neon database using the same connection string as Vercel (SQLAlchemy read-only mirror)
  5. `api.handriti.is` routes to Railway and `handriti.is` routes to Vercel; CORS headers allow cross-origin requests between them
**Plans**: TBD

Plans:
- [ ] 06-01: Maintenance mode middleware + page
- [ ] 06-02: FastAPI project scaffold on Railway (health check, CORS, env)
- [ ] 06-03: Clerk JWT verification on FastAPI + shared DB access
- [ ] 06-04: Subdomain routing (api.handriti.is DNS + Vercel rewrites)

#### Phase 7: ElevenLabs Scribe v2 STT Layer
**Goal**: Pro users can record a meeting and receive real-time transcription via ElevenLabs Scribe v2 — with speaker diarization, keyterm prompting, and confidence data — without the API key ever reaching the browser
**Depends on**: Phase 6
**Requirements**: STT-01, STT-02, STT-03, STT-04, STT-05, STT-06, STT-07, STT-08
**Success Criteria** (what must be TRUE):
  1. The browser connects to ElevenLabs Scribe v2 via WebSocket using a single-use token from `/api/scribe-token`; the ElevenLabs API key never appears in browser network traffic
  2. During a live recording, words appear in the transcript within 2 seconds of being spoken; filler words are stripped by default (no-verbatim mode)
  3. The transcript labels each speaker by name (editable per session); the speaker diarization updates without interrupting the live display
  4. Meeting keyterms from the selected template are sent to Scribe at session start; Icelandic proper nouns and domain terms are recognized correctly
  5. Word-level confidence scores are available in the data model; low-confidence words are visually distinguishable in the transcript view
**Plans**: TBD

Plans:
- [ ] 07-01: Single-use token endpoint + ElevenLabs WebSocket client
- [ ] 07-02: VAD commit strategy + no-verbatim mode + audio event tagging
- [ ] 07-03: Speaker diarization data model + editable names UI
- [ ] 07-04: Keyterm prompting per template + word-level timestamps/confidence

#### Phase 8: OpenRouter LLM Routing
**Goal**: All new LLM calls go through OpenRouter — giving the user a model selection dropdown, automatic fallback on provider failure, and streaming responses — with no direct OpenAI or Gemini SDK calls in new code
**Depends on**: Phase 6
**Requirements**: LLM-01, LLM-02, LLM-03, LLM-04
**Success Criteria** (what must be TRUE):
  1. All new LLM calls use the OpenRouter base URL with the OpenAI SDK drop-in; no new `import` of `@google/generative-ai` or direct `openai` SDK appears in v2 code
  2. User can open meeting settings and select an LLM model from a curated dropdown; the selected model is used for that session's agent calls
  3. When the primary model returns an error, the system automatically retries with the next model in the fallback array — the user sees no interruption
  4. Agent responses stream token-by-token to the client via SSE; the summary panel updates in real time as the LLM generates
**Plans**: TBD

Plans:
- [ ] 08-01: OpenRouter client wrapper + model registry + fallback array
- [ ] 08-02: Model selection dropdown in meeting settings (per-tier restrictions)
- [ ] 08-03: Streaming SSE through FastAPI → Next.js → browser

#### Phase 9: Meeting Agent (FastAPI WebSocket)
**Goal**: Pro users have a persistent meeting agent running for the duration of their meeting — tracking agenda items, updating a running summary, extracting action items, scoring meeting health, and surviving reconnections
**Depends on**: Phase 7, Phase 8
**Requirements**: AGNT-01, AGNT-02, AGNT-03, AGNT-04, AGNT-05, AGNT-06, AGNT-07, AGNT-08
**Success Criteria** (what must be TRUE):
  1. A 2-hour meeting session stays connected to the FastAPI WebSocket agent without timeout; the agent holds running state (summary, agenda progress, speaker stats) in memory for the session duration
  2. Within 5 seconds of a new transcript block arriving, the running summary panel updates to reflect the new content
  3. As the meeting proceeds, agenda items are automatically checked off when the transcript indicates that topic was covered; uncovered items remain visible
  4. Action items are extracted and displayed in real time; each action item shows the speaker who committed to it
  5. The meeting health score (agenda coverage, speaking balance, on-topic ratio) updates after each transcript block and is visible without navigating away
  6. If the browser loses connection, the agent preserves session state for 5 minutes; reconnecting within that window restores the live meeting view with no data loss
**Plans**: TBD

Plans:
- [ ] 09-01: FastAPI WebSocket endpoint + session state model (2hr+ keepalive)
- [ ] 09-02: Running summary + agenda tracking with auto-checkoff
- [ ] 09-03: Action item extraction + speaker stats accumulation
- [ ] 09-04: Meeting health score + "running out of time" nudge
- [ ] 09-05: Reconnection handling (5-min grace period + session ID recovery)

#### Phase 10: Meeting UX
**Goal**: Users experience a meeting interface designed for focus — a clean default mode with notepad and agenda sidebar, an opt-in dashboard with full data, and visual cues for speaker activity and confidence
**Depends on**: Phase 9
**Requirements**: UX-01, UX-02, UX-03, UX-04, UX-05, UX-06, UX-07
**Success Criteria** (what must be TRUE):
  1. By default, the meeting view shows only the notepad, agenda sidebar with checkboxes, and a recording indicator — no transcript clutter
  2. Toggling to dashboard mode reveals the full transcript, summary panel, speaker timeline, and meeting health score without leaving the page
  3. After the meeting ends, the user can review their personal notes alongside the transcript and trigger an LLM merge that produces a combined post-meeting document
  4. The speaker timeline bar shows color-coded segments of who spoke when across the full session duration
  5. Low-confidence words in the transcript appear at reduced opacity; the user can distinguish uncertain transcription from confident words at a glance
**Plans**: TBD

Plans:
- [ ] 10-01: Focus mode layout (notepad + agenda sidebar + recording indicator)
- [ ] 10-02: Dashboard mode toggle + full transcript + summary panel
- [ ] 10-03: Hybrid notepad + LLM merge post-meeting
- [ ] 10-04: Speaker timeline bar + confidence visualization + progressive disclosure summary

#### Phase 11: Tiered Access + Export
**Goal**: Free, Starter, and Pro users each get the right STT and LLM stack for their tier; every user can export polished meeting minutes as a reviewed PDF; meeting templates with agendas persist and carry over action items
**Depends on**: Phase 9, Phase 10
**Requirements**: TIER-01, TIER-02, TIER-03, TIER-04, EXPORT-01, EXPORT-02, EXPORT-03, EXPORT-04
**Success Criteria** (what must be TRUE):
  1. A Free user's meeting is transcribed using browser Whisper WASM with a 60 min/month cap; they cannot access Scribe or the agent
  2. A Starter user's meeting is transcribed using whisper-1 API with Gemini 2.5 Flash for LLM; they get batch processing but no real-time agent
  3. A Pro user gets Scribe v2 + the FastAPI agent + Sonnet with real-time diarization and 30 hrs/month; the model selection dropdown reflects their tier's allowed models
  4. Any user can export meeting minutes as a PDF after reviewing and editing a draft; PII scrubbing via Scribe batch entity detection is applied before export
  5. Saved meeting templates (agenda, models, keyterms) load automatically for recurring meeting types; unfinished action items from the previous meeting of the same template auto-populate the next session
**Plans**: TBD

Plans:
- [ ] 11-01: Tier enforcement (Free: browser Whisper WASM, Starter: whisper-1, Pro: Scribe+agent)
- [ ] 11-02: Model selection dropdowns with per-tier restrictions
- [ ] 11-03: PDF export with human-in-the-loop review + PII scrubbing (Scribe batch)
- [ ] 11-04: Meeting templates (save/load) + action item carry-over

#### Phase 12: Backwards Compatibility Cleanup
**Goal**: All v1 dead code is documented and removed — the codebase contains only v2 paths, deprecated routes are gone, and there are no unused SDK imports or orphaned files
**Depends on**: Phase 11
**Requirements**: CLEAN-01, CLEAN-02
**Success Criteria** (what must be TRUE):
  1. CLEANUP.md exists and lists every deprecated route, SDK import, component, and file introduced in M1 that is no longer used in v2, with the reason for removal
  2. All items listed in CLEANUP.md have been deleted from the codebase; `npm run build` passes with no references to removed code; no v1-only routes exist in `app/api/`
**Plans**: TBD

Plans:
- [ ] 12-01: Audit v1 code + generate CLEANUP.md
- [ ] 12-02: Execute removals + verify build passes

## Progress

**Execution Order:**
M1: 1 → 2 → 3 → 4 → 5 (complete)
M2: 6 → 7 → 8 → 9 → 10 → 11 → 12

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Foundation + Auth + Database | v1.0 | -/- | Complete | 2026-03 |
| 2. Live Recording Flow | v1.0 | -/- | Complete | 2026-03 |
| 3. File Upload Flow | v1.0 | -/- | Complete | 2026-03 |
| 4. GPT Realtime Flow | v1.0 | -/- | Complete | 2026-03 |
| 5. Polish + Deployment | v1.0 | -/- | Complete | 2026-03 |
| 6. Infrastructure + Maintenance Mode | v2.0 | 0/4 | Not started | - |
| 7. ElevenLabs Scribe v2 STT Layer | v2.0 | 0/4 | Not started | - |
| 8. OpenRouter LLM Routing | v2.0 | 0/3 | Not started | - |
| 9. Meeting Agent (FastAPI WebSocket) | v2.0 | 0/5 | Not started | - |
| 10. Meeting UX | v2.0 | 0/4 | Not started | - |
| 11. Tiered Access + Export | v2.0 | 0/4 | Not started | - |
| 12. Backwards Compatibility Cleanup | v2.0 | 0/2 | Not started | - |
