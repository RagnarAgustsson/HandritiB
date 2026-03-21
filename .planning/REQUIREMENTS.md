# Requirements: Handriti v2.0 — Meeting Intelligence Tool

**Defined:** 2026-03-21
**Core Value:** Icelandic speakers can run meetings and get accurate real-time transcription, live summaries, agenda tracking, and structured meeting minutes

## v2.0 Requirements

### Infrastructure

- [x] **INFRA-01**: Maintenance mode toggleable via env var (shows "Handriti er að fara í glowup" page)
- [x] **INFRA-02**: FastAPI backend deployed on Railway with health check endpoint
- [x] **INFRA-03**: Clerk JWT verification working on FastAPI backend (shared auth)
- [x] **INFRA-04**: Neon DB accessible from both Vercel and Railway (shared database)
- [ ] **INFRA-05**: Subdomain routing — api.handriti.is → Railway, handriti.is → Vercel

### STT (Speech-to-Text)

- [ ] **STT-01**: ElevenLabs Scribe v2 Realtime transcription via client-side WebSocket
- [ ] **STT-02**: Single-use token generation endpoint (never expose API key to browser)
- [ ] **STT-03**: VAD commit strategy for live meetings
- [ ] **STT-04**: Speaker diarization with editable names per session
- [ ] **STT-05**: Keyterm prompting per meeting template (up to 1,000 Icelandic terms)
- [ ] **STT-06**: Word-level timestamps and confidence scores
- [ ] **STT-07**: No-verbatim mode on by default (strips filler words)
- [ ] **STT-08**: Audio event tagging enabled (laughter, applause)

### LLM Routing

- [ ] **LLM-01**: All new LLM calls routed through OpenRouter (drop-in OpenAI SDK replacement)
- [ ] **LLM-02**: User can select LLM model from curated dropdown in meeting settings
- [ ] **LLM-03**: Model fallback array (auto-route on provider failure)
- [ ] **LLM-04**: Streaming responses via OpenRouter SSE

### Meeting Agent

- [ ] **AGNT-01**: FastAPI WebSocket agent maintains state for duration of meeting (2hr+)
- [ ] **AGNT-02**: Running summary updated live as transcript blocks arrive
- [ ] **AGNT-03**: Agenda tracking — agent compares transcript to agenda, checks off items
- [ ] **AGNT-04**: Action item extraction in real-time
- [ ] **AGNT-05**: Speaker stats accumulation from diarization data
- [ ] **AGNT-06**: Meeting health score (agenda coverage, speaking balance, on-topic ratio)
- [ ] **AGNT-07**: "Running out of time" nudge when agenda items remain near scheduled end
- [ ] **AGNT-08**: Reconnection handling (5-min grace period, session ID recovery)

### UX

- [ ] **UX-01**: Focus mode (default) — notepad + agenda sidebar + recording indicator
- [ ] **UX-02**: Dashboard mode (opt-in) — full transcript + summary + agenda + speaker timeline
- [ ] **UX-03**: Hybrid notepad — user notes merged with transcript post-meeting by LLM
- [ ] **UX-04**: Speaker timeline bar (color-coded, who spoke when)
- [ ] **UX-05**: Confidence visualization (low-confidence words at reduced opacity)
- [ ] **UX-06**: Progressive disclosure summary panel (collapsible, badge count for updates)
- [ ] **UX-07**: Agenda sidebar with checkboxes, progress bar, auto-checkoff

### Tiers

- [ ] **TIER-01**: Free tier — browser Whisper WASM (small model), post-meeting batch, 60 min/mo
- [ ] **TIER-02**: Starter tier — whisper-1 API, Gemini 2.5 Flash, batch processing, 10 hrs/mo
- [ ] **TIER-03**: Pro tier — Scribe v2 + agent + Sonnet, real-time, diarization, 30 hrs/mo
- [ ] **TIER-04**: Model selection dropdowns (STT + LLM) per tier restrictions

### Export & Post-Meeting

- [ ] **EXPORT-01**: PDF export with human-in-the-loop review (draft → edit → export)
- [ ] **EXPORT-02**: Entity detection for PII scrubbing before export (Scribe batch API)
- [ ] **EXPORT-03**: Meeting templates (save/load meeting type with default agenda, models, keyterms)
- [ ] **EXPORT-04**: Carry-over — unfinished action items from last meeting auto-populate next

### Cleanup

- [ ] **CLEAN-01**: Detailed CLEANUP.md documenting all v1 dead code to remove
- [ ] **CLEAN-02**: Remove deprecated routes, SDKs, and unused code after v2 is verified

## Future Requirements (v2.1+)

- **FUTURE-01**: Meeting comparison trends over time per template type
- **FUTURE-02**: TTS summary readback (ElevenLabs eleven_flash_v2_5)
- **FUTURE-03**: Conversational search across meeting history ("Ask Handriti")
- **FUTURE-04**: Coupon code system for promotional trials
- **FUTURE-05**: Browser-side Whisper model upgrade (medium/large quantized)

## Out of Scope

| Feature | Reason |
|---------|--------|
| Mobile native app | Web-first for MBA timeline |
| Video recording | Audio only — complexity + storage |
| CRM integrations | Not core to meeting intelligence |
| On-premise deployment | SaaS only for v2 |
| Custom voice cloning / Icelandic TTS | Needs quality verification first |
| OAuth social login | Clerk email/password sufficient |
| Real-time chat between participants | Out of scope — this is a recording tool |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| INFRA-01 | Phase 6 | Complete |
| INFRA-02 | Phase 6 | Complete |
| INFRA-03 | Phase 6 | Complete |
| INFRA-04 | Phase 6 | Complete |
| INFRA-05 | Phase 6 | Pending |
| STT-01 | Phase 7 | Pending |
| STT-02 | Phase 7 | Pending |
| STT-03 | Phase 7 | Pending |
| STT-04 | Phase 7 | Pending |
| STT-05 | Phase 7 | Pending |
| STT-06 | Phase 7 | Pending |
| STT-07 | Phase 7 | Pending |
| STT-08 | Phase 7 | Pending |
| LLM-01 | Phase 8 | Pending |
| LLM-02 | Phase 8 | Pending |
| LLM-03 | Phase 8 | Pending |
| LLM-04 | Phase 8 | Pending |
| AGNT-01 | Phase 9 | Pending |
| AGNT-02 | Phase 9 | Pending |
| AGNT-03 | Phase 9 | Pending |
| AGNT-04 | Phase 9 | Pending |
| AGNT-05 | Phase 9 | Pending |
| AGNT-06 | Phase 9 | Pending |
| AGNT-07 | Phase 9 | Pending |
| AGNT-08 | Phase 9 | Pending |
| UX-01 | Phase 10 | Pending |
| UX-02 | Phase 10 | Pending |
| UX-03 | Phase 10 | Pending |
| UX-04 | Phase 10 | Pending |
| UX-05 | Phase 10 | Pending |
| UX-06 | Phase 10 | Pending |
| UX-07 | Phase 10 | Pending |
| TIER-01 | Phase 11 | Pending |
| TIER-02 | Phase 11 | Pending |
| TIER-03 | Phase 11 | Pending |
| TIER-04 | Phase 11 | Pending |
| EXPORT-01 | Phase 11 | Pending |
| EXPORT-02 | Phase 11 | Pending |
| EXPORT-03 | Phase 11 | Pending |
| EXPORT-04 | Phase 11 | Pending |
| CLEAN-01 | Phase 12 | Pending |
| CLEAN-02 | Phase 12 | Pending |

**Coverage:**
- v2.0 requirements: 33 total
- Mapped to phases: 33
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-21*
*Last updated: 2026-03-21 — traceability populated after roadmap creation*
