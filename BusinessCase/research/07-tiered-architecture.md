# Tiered Architecture — Cost & Feature Matrix

*Researched: 2026-03-21*

## The key insight: STT cost drives tiers, not LLM cost

LLM cost per meeting: $0.002 (Qwen) to $0.12 (Sonnet). Negligible.
STT cost per meeting hour: $0 (browser Whisper) to $0.40 (ElevenLabs). This is the real cost driver.

## STT options for Icelandic (limited market)

| Provider | Icelandic? | Cost/hr | Real-time? | Diarization? |
|----------|-----------|---------|------------|-------------|
| ElevenLabs Scribe v2 | Yes | $0.40 ($0.22 Business) | Yes | Yes (32 speakers) |
| OpenAI gpt-4o-transcribe | Yes | $3.60 | No (batch) | No |
| OpenAI gpt-4o-mini-transcribe | Yes | $0.60 | No (batch) | No |
| OpenAI whisper-1 API | Yes | $0.36 | No (batch) | No |
| Deepgram Nova-3 | **NO** | $0.46 | Yes | Yes |
| AssemblyAI | **NO** | $0.65 | Yes | Yes |
| Whisper WASM (browser) | Yes | $0 | **NO** | No |

**Icelandic eliminates Deepgram and AssemblyAI.**

## Browser Whisper (free tier)

- Models: tiny (75MB), base (142MB), small (466MB)
- NOT real-time: 60s audio takes ~20-30s to transcribe
- Max: 2 min mic, 30 min file
- Small model is minimum for acceptable Icelandic
- Post-meeting batch processing only

## Tier matrix

| | **Free** | **Starter ($12/mo)** | **Pro ($29/mo)** |
|---|---|---|---|
| **STT** | Browser Whisper WASM (small) | whisper-1 API ($0.36/hr) | ElevenLabs Scribe v2 ($0.40/hr) |
| **LLM** | Qwen 3.5 Flash | Gemini 2.5 Flash | Claude Sonnet (OpenRouter) |
| **Processing** | Post-meeting batch | Post-meeting batch (faster) | Real-time streaming |
| **Diarization** | No | No | Yes |
| **Live summary** | No | No | Yes (streaming) |
| **Agenda tracking** | No | Keyword matching (post) | LLM agent (live) |
| **Health score** | No | Basic (duration, silence) | Full (speakers, on-topic, balance) |
| **Notepad + merge** | No | Yes | Yes |
| **Action items** | Post-meeting | Post-meeting | Live extraction |
| **Keyterms** | No | No | Up to 1,000 |
| **Entity redaction** | No | No | Yes |
| **Export** | Markdown | PDF/DOCX | PDF/DOCX/SRT + email |
| **Confidence viz** | No | Basic | Full with review mode |
| **Speaker names** | No | No | Editable + memory |
| **Templates** | No | Basic | Full with carry-over |
| **Meeting trends** | No | No | Cross-meeting analytics |
| **Limit** | 60 min/mo | 10 hrs/mo | 30 hrs/mo |
| **Your cost/user/mo** | ~$0.36 | ~$5 | ~$13 |

## Natural breakpoints

| Transition | What changes | Why it matters |
|-----------|-------------|---------------|
| Free → Starter | Server-side STT (whisper-1) | Reliable quality, no client burden |
| Starter → Pro | ElevenLabs streaming + Sonnet | Real-time experience + diarization |

## Feature degradation (what works without real-time)

**Works equally well post-meeting:**
- Summary generation
- Action item extraction
- Agenda tracking via keyword/semantic matching

**Degrades significantly without real-time:**
- No live feedback (the "wow" factor)
- No speaker diarization without ElevenLabs
- Health score limited to basic metrics
