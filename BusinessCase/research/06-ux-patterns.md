# Meeting UX Patterns — Research & Recommendations

*Researched: 2026-03-21*

## Competitor landscape (2025-2026)

| Tool | Key UX insight | Steal? |
|------|---------------|--------|
| **Granola** | Notepad-first. AI merges user notes with transcript post-meeting. User stays present. | YES — hybrid notepad |
| **Otter.ai** | Playback with synced audio+text. Collaborative annotation. MCP Server for Claude integration. | Playback sync |
| **Read.ai** | Meeting health pioneer. Real-time engagement/sentiment dashboard. 2-min highlight reels. | YES — health score patterns |
| **Jamie** | No-bot. Speaker memory (learns voices). Privacy-first (audio deleted after transcription). | YES — speaker memory |
| **Fathom** | "Ask Fathom" — conversational search across all past meetings. | Future feature |
| **Tactiq** | Bot-free, visible only to initiating user. Shift cognitive load to post-meeting. | Philosophy |
| **Krisp** | On-device. 750 custom vocabulary terms. Pre-meeting agenda suggestions. | Keyterm UX |
| **Granola 2.0** | "Second brain for your team" — MCP integration for AI tools. | Future |

## Two meeting modes (our recommendation)

### Focus mode (default)
- Minimal UI: agenda sidebar + notepad + recording indicator
- Live summary runs silently, accessible via badge/tab
- User stays present in the meeting
- Post-meeting: AI merges notes with full transcript

### Dashboard mode (opt-in)
- Full live transcript + summary + agenda + speaker timeline
- For board secretary, demo, or user who wants to watch AI work
- Toggleable per meeting template

## Live transcription display patterns

1. **Background transcript, foreground notepad** (Granola) — RECOMMENDED default
2. **Live captions overlay** (Otter, Tactiq) — subtitle-style
3. **Scrolling transcript panel** — auto-scroll with "scroll lock" on manual scroll
4. **Invisible during / rich after** (Jamie, Fathom) — nothing during meeting

## Speaker diarization UX

- Color-coded speaker labels with colored left-border per speech block
- Editable names: rename "Speaker A" → "Jón" once, system remembers per template
- Speaker timeline bar: thin horizontal bar showing who spoke when
- Talk-time percentage per speaker (feeds health score)

## Live summary without distraction

- **Progressive disclosure**: New bullet points fade in with subtle animation
- **Collapsible panel**: "Yfirferð" panel collapses to thin strip with count badge
- **Never auto-expand**: User chooses when to look
- **Notification dot**: Small indicator on "Summary" tab

## Confidence visualization

- **Reduced opacity** for low-confidence words (50% alpha)
- **Hover tooltip** with confidence percentage
- **Review mode toggle**: Highlights all low-confidence segments for correction
- Especially valuable for Icelandic where ASR confidence is lower

## Agenda tracking UX (our differentiator)

- Left sidebar with checkboxes, items auto-check on topic detection
- Progress bar: "3/5 agenda items covered"
- Time estimate per item vs actual time spent
- "Off-topic" gentle indicator when discussion drifts
- **"Running out of time" nudge**: "2 items not yet discussed, 5 minutes remaining"
- Uncovered items highlighted at meeting end

## Meeting health score display

- Simple 0-100 score with color ring (green/amber/red)
- Components: talk-time balance, duration vs scheduled, agenda completion, silence ratio
- Shown post-meeting (not during — avoids distraction)
- Trends over time per meeting template: "Agenda coverage improved from 65% → 90%"

## Recommended layout (dashboard mode)

```
+--------------------------------------------------+
| [Meeting Title]  [Health: 82]  [00:23:45]  [Stop]|
+----------+-------------------+-------------------+
| AGENDA   |   LIVE AREA       |   YFIRFERD       |
| (narrow) |   (primary)       |   (collapsible)  |
|          |                   |                   |
| [x] Item1|   Notepad or      |   - Key point 1  |
| [x] Item2|   Transcript      |   - Key point 2  |
| [ ] Item3|   (user toggles)  |   - Action: ...   |
| [ ] Item4|                   |                   |
|          |                   |                   |
| Progress:|   Speaker: Jón    |                   |
| ████░░   |   "..."           |                   |
| 2/4      |                   |                   |
+----------+-------------------+-------------------+
| Speaker timeline: [===Jón===][==Anna==][==Jón==] |
+--------------------------------------------------+
```
