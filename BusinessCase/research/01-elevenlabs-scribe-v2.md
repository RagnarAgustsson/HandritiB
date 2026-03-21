# ElevenLabs Scribe v2 — Full Capability Map

*Researched: 2026-03-21*

## Realtime API (WebSocket)

**Connection:** `wss://api.elevenlabs.io/v1/speech-to-text/realtime?model_id=scribe_v2_realtime`

**Regional endpoints:**
- US West (default): `wss://api.elevenlabs.io/`
- US East: `wss://api.us.elevenlabs.io/`
- EU (Amsterdam): `wss://api.eu.residency.elevenlabs.io/`
- India: `wss://api.in.residency.elevenlabs.io/`

**Authentication:**
- Server-side: `xi-api-key` header
- Client-side: Single-use token (auto-expires 15 min), generated via `elevenlabs.tokens.singleUse.create("realtime_scribe")`

**Query parameters:**
| Parameter | Default | Notes |
|-----------|---------|-------|
| `model_id` | — | `scribe_v2_realtime` |
| `audio_format` | `pcm_16000` | Also: pcm_8000/22050/24000/44100/48000, ulaw_8000 |
| `language_code` | auto | ISO 639-1 or 639-3 |
| `include_timestamps` | false | Word-level start/end/speaker_id/logprob |
| `include_language_detection` | false | Returns detected language |
| `commit_strategy` | `manual` | Also: `vad` (voice activity detection) |
| `vad_silence_threshold_secs` | 1.5 | Silence before auto-commit |
| `vad_threshold` | 0.4 | VAD sensitivity |
| `min_speech_duration_ms` | 100 | Min speech to trigger |
| `min_silence_duration_ms` | 100 | Min silence to detect |
| `enable_logging` | true | false = zero-retention (enterprise) |

**Client → Server messages:**
- `input_audio_chunk`: `{ message_type, audio_base_64, commit, sample_rate, previous_text? }`
- `previous_text`: Up to 50 chars, first chunk only, improves accuracy on reconnection

**Server → Client messages:**
- `session_started`: Session ID + config
- `partial_transcript`: Interim results (~150ms latency)
- `committed_transcript`: Final results
- `committed_transcript_with_timestamps`: Final + word-level data

**Word object (with timestamps):**
```json
{
  "text": "ætlum",
  "start": 0.37,
  "end": 0.62,
  "type": "word",
  "speaker_id": "A",
  "logprob": -0.12
}
```

**Commit strategies:**
- **Manual**: Client sends `commit: true` or calls `connection.commit()`. Best practice: every 20-30s, during silence.
- **VAD**: Auto-commits on silence. Recommended for live microphone use.
- Auto-commit every 90s regardless.
- Committing multiple times rapidly degrades quality.

**Error types (15):** auth_error, quota_exceeded, transcriber_error, input_error, error, commit_throttled, unaccepted_terms, rate_limited, queue_overflow, resource_exhausted, session_time_limit_exceeded, chunk_size_exceeded, insufficient_audio_activity

## Batch API (POST /v1/speech-to-text)

Additional features not in realtime:

- **Entity detection**: PII, PHI, PCI — 40+ entity types with char positions
- **Entity redaction**: Auto-mask detected entities
- **Multichannel**: Up to 5 channels, per-channel speaker assignment
- **Webhooks**: Async transcription with POST callbacks, signature verification
- **Cloud storage URLs**: Transcribe from S3/GCS/R2/CDN (up to 2GB)
- **Export formats**: DOCX, HTML, PDF, SRT, TXT, segmented JSON
- **Deterministic output**: `seed` + `temperature` (0.0-2.0)
- **File limits**: 3GB upload, 2GB from URL, 10hr max (1hr multichannel)

## Key features for Handriti

| Feature | Value for project |
|---------|------------------|
| **Keyterm prompting** | Up to 1,000 terms (50 chars each). Essential for Icelandic names, places, domain vocab per meeting template. |
| **No-verbatim mode** | `no_verbatim` strips filler words/false starts. Cleaner LLM input. |
| **Speaker diarization** | Up to 32 speakers, adjustable threshold (0.22 default). Feeds health score + meeting minutes. |
| **Audio event tagging** | `(laughter)`, `(applause)`, `(music)` in transcript. Adds meeting context. |
| **Word confidence** | `logprob` per word. Low-confidence words shown at reduced opacity in UI. |
| **Language detection** | Auto-detect mid-meeting language switches. |
| **EU endpoint** | Amsterdam for GDPR-sensitive clients. |
| **Zero retention** | `enable_logging: false` for enterprise. |

## SDKs

- **Python**: `elevenlabs` (v1.59.0) — `pip install elevenlabs`
- **JavaScript**: `@elevenlabs/elevenlabs-js` (v2.39.0) — `npm install elevenlabs`
- **React**: `@elevenlabs/react` (v0.14.3, v1.0.0-rc.1 RC) — `useScribe` hook with echo cancellation, noise suppression, auto gain
- **Vercel AI SDK**: `@ai-sdk/elevenlabs` (v2.0.26, v3.0.0 beta) — `transcribe()` + `experimental_generateSpeech()`

## Pricing
- Realtime: ~$0.40/hr (standard), ~$0.22/hr (Business tier)
- Entity detection + keyterms: additional charges
- Keyterms >100 require min 20s billable duration
