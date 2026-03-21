# Handriti

## What This Is

Handriti is an Icelandic meeting intelligence tool. It listens to meetings in real time, generates live summaries, tracks agenda items, extracts action items, and scores meeting health. It supports multiple languages (is, nb, da, sv) with Icelandic as the primary focus. The system uses ElevenLabs Scribe v2 for speech-to-text, OpenRouter for LLM routing, and a FastAPI agent backend for persistent meeting state.

## Core Value

Icelandic speakers can run meetings and get accurate real-time transcription, live summaries, agenda tracking, and structured meeting minutes — with no tool on the market doing this for Icelandic.

## Current Milestone: v2.0 — Meeting Intelligence Tool

**Goal:** Migrate from a transcription-only tool to a full meeting intelligence platform with a backend agent, swappable STT/LLM models, agenda tracking, and tiered pricing.

**Target features:**
- Maintenance mode for controlled migration
- FastAPI agent backend on Railway (WebSocket, persistent meeting state)
- ElevenLabs Scribe v2 Realtime (client-side, diarization, keyterms)
- OpenRouter for all LLM routing (replaces direct OpenAI/Gemini SDKs)
- Meeting agent: agenda tracking, running summary, health score, action items
- UX: focus mode / dashboard mode, notepad + merge, speaker timeline
- Tiered architecture: free (browser Whisper) / starter (whisper-1) / pro (Scribe + agent)
- Backwards compatibility cleanup after launch

## Requirements

### Validated

(From M1 — these capabilities are proven and must be preserved)

- ✓ User can record live audio and receive transcription + notes — M1
- ✓ User can upload audio files and receive transcript + summary — M1
- ✓ Sessions support multiple prompt profiles (fundur, fyrirlestur, viðtal, frjálst, stjórnarfundur) — M1
- ✓ Users can sign up and log in (Clerk), with sessions persisted — M1
- ✓ Transcription and summarization tuned for Icelandic — M1
- ✓ Results stored and viewable after session ends — M1
- ✓ Subscription system with trials, usage tracking (Paddle) — M1
- ✓ Admin panel with user management, audit log — M1
- ✓ Email delivery of yfirferð + samantekt (Resend) — M1
- ✓ i18n support (is, nb, da, sv) — M1

### Active

See `.planning/REQUIREMENTS.md` for detailed REQ-IDs.

### Out of Scope

- Mobile native app — web-first
- Video recording — audio only
- CRM integrations — not for v2.0
- On-premise/self-hosted deployment — SaaS only
- Custom voice cloning / TTS in Icelandic — needs verification first
- Coupon code system — defer to post-launch

## Context

**MBA project** — University of Iceland Executive MBA, "AI and the Leader" course. 4-week deadline (March 21 - ~April 18, 2026). Deliverables: working tool + written report + demo.

**Research completed** — 8 research documents in `BusinessCase/research/` covering ElevenLabs Scribe v2 API, OpenRouter, FastAPI agent patterns, Railway deployment, Vercel-Railway coexistence, UX patterns, tiered architecture, and feature ideas.

**Accounts ready** — ElevenLabs, OpenRouter (funded), Railway (GitHub connected). Keys in `.env.local`.

**Architecture decision** — Scribe runs client-side (browser → ElevenLabs directly via single-use tokens). Agent runs server-side (FastAPI WebSocket on Railway). OpenRouter for all LLM calls. Neon DB shared between Vercel and Railway.

## Constraints

- **Timeline**: 4 weeks (MBA deadline)
- **Language**: Icelandic primary, all UI + prompts in Icelandic
- **STT**: ElevenLabs Scribe v2 Realtime (Pro tier), whisper-1 (Starter), browser Whisper (Free)
- **LLM**: All via OpenRouter — no direct SDK imports for new code
- **Backend**: FastAPI + WebSocket on Railway (api.handriti.is)
- **Frontend**: Next.js on Vercel (handriti.is) — existing stack
- **Auth**: Clerk (shared via JWT verification between Vercel + Railway)
- **Database**: Neon PostgreSQL — Drizzle owns migrations, SQLAlchemy mirrors read-only
- **Payments**: Paddle (existing)
- **Backwards compatibility**: Old routes stay until v2 is verified, then cleanup

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Replace Supabase with Clerk + Neon + Drizzle | Separate concerns = debuggable | ✓ Good (M1) |
| Drop client-side FFmpeg | Removes hardest dependency | ✓ Good (M1) |
| ElevenLabs Scribe v2 as primary STT | 3.1% WER on Icelandic, realtime WebSocket, diarization | — Pending |
| OpenRouter for all LLM routing | One API key, 290+ models, automatic fallback, tool use | — Pending |
| FastAPI on Railway for agent backend | Persistent WebSocket sessions (2hr+), Vercel can't do this | — Pending |
| Scribe client-side via single-use tokens | Lower latency, less server load, never expose API key | — Pending |
| Subdomain routing (api.handriti.is → Railway) | Clean separation, CORS-based | — Pending |
| Maintenance mode via env var | Instant on/off, no deploy needed, old code stays as safety net | — Pending |
| Drizzle owns migrations, SQLAlchemy mirrors | Single source of truth for schema | — Pending |

---
*Last updated: 2026-03-21 after milestone v2.0 initialization*
