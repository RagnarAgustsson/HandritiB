# New Feature Ideas — Synthesis

*Researched: 2026-03-21*

## From ElevenLabs capabilities

### 1. No-verbatim mode
Scribe's `no_verbatim` strips filler words and false starts before the LLM sees the text.
- Cleaner input = better summaries = lower token count
- On by default. Toggle off for legal/verbatim use cases (e.g., court recordings).

### 2. Cloud URL transcription
Scribe can transcribe directly from a Vercel Blob URL (up to 2GB).
- Eliminates the current download-then-reupload step for file uploads
- Simpler, faster, cheaper

### 3. Audio event tagging
`(laughter)`, `(applause)`, `(music)` in transcript.
- Adds meeting context that summaries can reference
- "The proposal was met with laughter"

### 4. Entity detection for privacy scrubbing
Before PDF export, run Scribe's entity detection to flag PII.
- User reviews flagged entities and can redact before export
- Critical for board minutes and healthcare meetings

### 5. Direct export formats
Scribe can output DOCX, HTML, PDF, SRT, TXT directly.
- May eliminate need for custom PDF generation
- SRT useful for meeting recordings with subtitles

### 6. TTS summary readback (stretch goal)
ElevenLabs eleven_flash_v2_5 (50% cheaper TTS).
- "Play summary" button — hear summary while commuting
- Needs Icelandic TTS quality verification first

## From UX research

### 7. Hybrid notepad (Granola model)
User jots quick notes during meeting. Post-meeting, LLM merges user notes with full Scribe transcript.
- User notes become "anchors" — AI fills in context around them
- Killer feature: no Icelandic tool has this

### 8. Confidence visualization
Low-confidence words at reduced opacity. Hover for details.
- Builds trust — users know where STT is uncertain
- "Review mode" highlights all uncertain segments for correction

### 9. Speaker timeline bar
Thin horizontal bar showing who spoke when, color-coded per speaker.
- Visual meeting dynamics at a glance
- Powers health score visualization
- Easy to build from word-level speaker_id + timestamps

### 10. "Running out of time" nudge
When nearing scheduled end with uncovered agenda items:
- "2 items not yet discussed, 5 minutes remaining"
- Agent being useful without being intrusive

### 11. Editable speaker names with memory
Rename "Speaker A" → "Jón" once. System remembers per template.
- Next meeting auto-assigns known voices
- Jamie does this — we should too

### 12. Meeting comparison over time
Trends across meetings of the same template type:
- "Board meetings: agenda coverage improved 65% → 90% over 4 meetings"
- "Average duration dropped from 72min to 55min"
- "Speaking balance improved"
- Makes subscription sticky — data only exists if you keep using the tool

## From architecture research

### 13. Focus mode vs Dashboard mode
- **Focus mode** (default): notepad + agenda sidebar + recording indicator. Summary on demand.
- **Dashboard mode** (opt-in): full transcript + summary + agenda + speaker timeline.
- Toggleable per meeting template.

### 14. Two meeting modes (presence-first philosophy)
The dominant 2025-2026 trend: less UI during, more intelligence after.
- Default to minimal. Progressive disclosure.
- Post-meeting richness is where most value is delivered.
