# Feature Landscape

**Domain:** Audio transcription and AI summarization web app (Icelandic language)
**Researched:** 2026-02-28
**Confidence:** MEDIUM — web search unavailable; analysis based on training knowledge of Otter.ai, Fireflies.ai, Granola, Whisper-based tools, and the existing Handriti codebase (cutoff Aug 2025)

---

## Table Stakes

Features users expect from day one. Missing any of these causes immediate abandonment or a feeling that the product is unfinished.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Live audio recording | Core product promise: record → get transcript | Med | MediaRecorder API + chunked upload; exists in current app |
| Real-time transcription during recording | Users need feedback that recording is working | Med | Whisper per-chunk; exists in current app |
| File upload for pre-recorded audio | Users have existing recordings they want to process | Med | Server-side splitting required (FFmpeg dropped client-side) |
| AI-generated summary after session | "Just tell me what happened" — the primary value prop | Med | GPT-4o-class model; exists in current app |
| Structured notes (not just a wall of text) | Raw transcript is hard to act on | Med | JSON-structured bullet points per chunk; exists in current app |
| Session history / past sessions list | Users return to previous recordings | Low | Requires auth + DB; exists in current app |
| Session detail view (transcript + notes + summary) | Users need to read and review results | Low | Results page; exists in current app |
| User authentication | Sessions are personal; data must be scoped | Med | Clerk replaces Supabase auth in rewrite |
| Icelandic language output | Core language requirement — non-negotiable for this product | High | Prompt engineering + Whisper language hints; exists |
| Session profiles (meeting, lecture, interview, casual) | Context shapes what a useful summary looks like | Low | Enum-driven prompt selection; exists in current app |
| Mobile browser recording | Most impromptu recordings happen on phones | Med | MediaRecorder works on mobile Safari/Chrome; test carefully |
| Loading / progress feedback during processing | File uploads can take 30-120s; silence feels broken | Low | Progress bar, streaming SSE already in current app |
| Error handling with user-facing messages | Recording fails, upload fails, API times out — user must know why | Low | Currently graceful degradation; must be preserved |

---

## Differentiators

Features that create competitive advantage or emotional resonance. Not expected on day one, but they drive retention and word-of-mouth once present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| GPT Realtime WebSocket mode | Bidirectional live AI conversation during recording — far beyond standard transcription | High | OpenAI Realtime API; exists in current app; unique in Icelandic context |
| Rolling / live summary during recording | Users see the story forming as they speak — not just at the end | High | SSE stream + rolling GPT summarization per chunk; exists |
| Profile-aware structured output | A lecture note looks different from a meeting note — AI adapts | Low | Prompt profiles already implemented; extension is easy |
| Copy-paste friendly output formatting | Users immediately paste summary into email or doc | Low | Markdown or clean text output with one-click copy |
| Session rename / title editing | Users name their recordings for findability | Low | Single DB field + inline edit UI |
| Session search | Find "the meeting where we discussed X" across history | Med | Full-text search on transcript text in Postgres |
| Export to text / markdown | Users want the output in their existing tools | Low | Server-rendered text/markdown download; no dependencies |
| Speaker diarization hint via profiles | Interview profile implies two speakers; guide Whisper prompt accordingly | Med | Prompt-level, not true diarization — achievable with current stack |
| Icelandic-specific vocabulary priming | Domain words (legal, medical, educational) improve accuracy | Med | Per-profile vocabulary lists injected into Whisper prompts |
| Auto-stop detection | Stop recording when there's silence — don't capture dead air | Med | Client-side VAD or silence threshold; currently server-side VAD in Realtime mode |
| Share session via link | Send summary to a colleague without requiring them to log in | Med | Public/unlisted session URL with read-only view |

---

## Anti-Features

Features to deliberately NOT build for v1. Including these would slow delivery, add maintenance burden, and distract from core value.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Credit / payment system | Complex billing logic, Stripe integration, webhook handling — major scope | Launch free; add monetization in a dedicated phase |
| Email delivery of results | Resend/SendGrid setup, email templates, spam compliance — not core | Link to session in-app; user copies what they need |
| Push notifications | Browser push requires service worker, VAPID keys, permission UX — high friction for low value | Polling / SSE is sufficient for in-session feedback |
| Speaker diarization (true) | Requires either Whisper large model + pyannote or Assembly AI — not available in plain OpenAI SDK | Use profile-level speaker hints in prompts; label per-exchange manually |
| Team workspaces / sharing | Multi-user orgs, permissions, billing seats — large surface area | Single-user scope for v1; share via link if needed |
| Calendar integrations (Google Calendar, Outlook) | OAuth scopes, token refresh, meeting import — separate product | Not needed; user starts session manually |
| CRM / Notion / Slack integrations | Webhook setup, API keys per-user, mapping output formats — low leverage | Users copy-paste for v1 |
| Custom AI model selection | Letting users pick GPT-4o vs o3 etc — adds UI, prompting complexity, cost unpredictability | Always use best-available model; abstract model choice internally |
| Offline mode / PWA | Service worker, IndexedDB sync, conflict resolution — high complexity | Browser tab must stay open during recording; network required |
| Audio playback synchronized with transcript | Timestamps per word + waveform UI — significant frontend work | Show transcript text only; audio not stored for replay |
| Multi-language support beyond Icelandic | Localization of UI, model selection per language, testing — scope explosion | Icelandic only for v1; architecture can extend later |
| Admin dashboard / analytics | Usage graphs, user management, model cost tracking — operational tool | Use Vercel logs + Neon console for now |
| Client-side FFmpeg | Removes maintainability, adds large WASM bundle, browser permission issues | Server-side splitting or file size limits for v1 |

---

## Feature Dependencies

```
User auth (Clerk)
  └── Session history (requires user ID on sessions)
      └── Session detail view
          └── Export / share

Live recording (MediaRecorder)
  └── Chunked upload API
      └── Real-time transcription (Whisper per chunk)
          └── Rolling summary (GPT per chunk)
              └── SSE stream to client
                  └── Live notes display

File upload
  └── Server-side audio splitting (replaces FFmpeg client)
      └── Segment transcription (Whisper)
          └── Full transcript assembly
              └── Final summary (GPT)
                  └── Results page

Session profiles
  └── Prompt selection (meeting / lecture / interview / casual)
      └── Real-time transcription (prompt context)
      └── Rolling summary (prompt context)
      └── Final summary (prompt context)

GPT Realtime (WebSocket)
  └── OpenAI Realtime API session token
  └── Client WebSocket connection
  └── (currently NOT connected to session history — separate mode)
```

---

## MVP Recommendation

The rewrite MVP must match the capabilities of the existing app without regression. Users who rely on Handriti today expect all validated features to work.

**Prioritize (must ship in v1):**

1. Live recording + chunked upload → real-time transcript + rolling notes
2. File upload → full transcript + final summary
3. User auth (Clerk) + session persistence
4. Session history list + session detail view
5. Session profiles (meeting, lecture, interview, casual)
6. Icelandic language tuning throughout
7. GPT Realtime WebSocket mode (existing differentiator)

**Include if low-effort (high value, low risk):**

- Copy button on transcript / notes / summary
- Session rename (single DB field, trivial UI)
- Mobile browser recording (test, not implement)

**Defer explicitly (write as tickets, not code):**

- Session search: wait until users have enough sessions to need it
- Export to file: useful but not blocking
- Share via link: useful but adds auth surface area
- Speaker diarization hints: research as Phase 2 item
- Any feature in the Anti-Features list above

---

## Confidence Notes

| Area | Confidence | Basis |
|------|------------|-------|
| Table stakes list | MEDIUM | Training data on Otter.ai, Fireflies, Whisper apps; corroborated by existing codebase |
| Differentiators | MEDIUM | Market knowledge from training; existing codebase confirms GPT Realtime and rolling summary as real differentiators |
| Anti-features | HIGH | Directly from PROJECT.md out-of-scope list + domain reasoning; no external source needed |
| Feature dependencies | HIGH | Derived from existing ARCHITECTURE.md data flow diagrams; directly observable |
| MVP recommendation | HIGH | Derived from PROJECT.md validated requirements list |

---

## Sources

- `/Users/ragnaragustsson/Documents/GitHub/Handriti/.planning/PROJECT.md` — validated requirements, out-of-scope decisions
- `/Users/ragnaragustsson/Documents/GitHub/Handriti/.planning/codebase/ARCHITECTURE.md` — existing data flows, feature inventory
- Training knowledge (Aug 2025 cutoff): Otter.ai, Fireflies.ai, Granola, Whisper-based SaaS, OpenAI Realtime API feature set
- Note: WebSearch and WebFetch unavailable during this research session; web-sourced claims marked MEDIUM confidence
