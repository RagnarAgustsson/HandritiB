# Handriti

## What This Is

Handriti is a public Icelandic speech transcription and summarization tool. Users record audio live, upload existing recordings, or connect via GPT Realtime — and get back structured notes and a final summary in Icelandic. It is designed to be maintainable and extendable by non-programmers using Claude Code.

## Core Value

Icelandic speakers can record or upload audio and get accurate transcripts and useful, structured summaries — reliably, with no setup required.

## Requirements

### Validated

(Inferred from existing codebase — these capabilities are proven and must be preserved)

- ✓ User can record live audio in chunks and receive real-time transcription + notes — existing
- ✓ User can upload a large audio file and receive a full transcript and final summary — existing
- ✓ User can start a GPT Realtime session (WebSocket) for live AI-assisted transcription — existing
- ✓ Sessions support multiple prompt profiles (meeting, lecture, interview, casual) — existing
- ✓ Users can sign up and log in, with sessions persisted across page refreshes — existing
- ✓ Transcription and summarization is tuned for Icelandic language — existing
- ✓ Results (transcript, notes, summary) are stored and viewable after session ends — existing

### Active

- [ ] Rewrite all features above on a simpler, maintainable stack (Clerk + Neon + Drizzle + OpenAI SDK)
- [ ] Remove FFmpeg client-side dependency — handle file segmentation server-side or accept file size limits
- [ ] App is deployable to Vercel with minimal environment variable setup
- [ ] Codebase is understandable by Claude Code with no background knowledge

### Out of Scope

- Credit/payment system — launch free, add monetization later
- Push notifications — not core to the transcription value
- Email delivery (Resend) — not needed for v1
- Client-side FFmpeg — too much complexity, drop or defer
- TypeScript strictness for its own sake — use types where they add clarity, not everywhere

## Context

This is a full rewrite of [gpt-realtime-test](https://github.com/RagnarAgustsson/gpt-realtime-test). The original is a Next.js 14 + TypeScript + Supabase + raw fetch OpenAI app. It works, but the Supabase auth/RLS setup, Next.js App Router layers, FFmpeg dependency, and scattered abstractions make it hard to extend without deep knowledge.

The rewrite should use the same AI capabilities (OpenAI Whisper + GPT) but with a stack where each layer is independently understandable: Clerk handles auth, Neon+Drizzle handles data, the OpenAI SDK handles AI, Vercel handles deployment.

Non-programmers will extend this using Claude Code and GSD. The codebase must be readable at a glance — short files, clear names, no clever abstractions.

## Constraints

- **Language**: Icelandic — all AI output must be in Icelandic, prompts must include language guidance
- **Deployment**: Vercel — must work with Vercel's serverless/edge constraints
- **AI**: OpenAI — Whisper for transcription, GPT-4o class model for summarization
- **Auth**: Clerk — no custom auth, no Supabase auth
- **Database**: Neon Postgres + Drizzle ORM — plain SQL, no RLS, no row-level policies
- **No FFmpeg on client**: Server-side only if needed, or accept upload size limits for v1

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Replace Supabase with Clerk + Neon + Drizzle | Supabase's combined auth+DB+RLS is too opaque for vibe coding. Separate concerns = each layer is debuggable independently | — Pending |
| Replace raw OpenAI fetch with official SDK | SDK handles streaming, error types, and retries better than manual fetch | — Pending |
| Drop client-side FFmpeg | Removes the hardest-to-maintain dependency. Server-side chunking or size limits acceptable for v1 | — Pending |
| Next.js App Router but simpler | Keep Next.js (Claude knows it well), but avoid edge runtime tricks and over-abstracted server components | — Pending |
| Drop push notifications for v1 | Not core to value, significant setup overhead | — Pending |

---
*Last updated: 2026-02-28 after initialization*
