# Handriti — Guardrails

## Fjórar leiðir í production

### 1. Hlaða upp skrá (`/hlada-upp` → `/api/hljod-skra`)
- Client velur skrá (≤24MB), hleður í Vercel Blob, sendir blob URL til server
- Server: sækir blob → transcribe (gpt-4o-transcribe, whisper-1 fallback) → yfirferð → samantekt → email
- Streaming SSE progress til client
- **Skrár:** `app/hlada-upp/HlaðaUppClient.tsx`, `app/api/hljod-skra/route.ts`, `app/api/blob-upload/route.ts`

### 2. Stór skrá — EXPERIMENTAL (`/hlada-upp` → `/api/hljod-stort`)
- Client velur skrá (≤100MB), ffmpeg.wasm klippir í 5 mín hluta client-megin
- Hvert chunk hlaðið í Vercel Blob, transcribed per-chunk, síðan yfirferð + samantekt
- Client-orchestrated: start → per-chunk upload+transcribe → summarize (SSE)
- **Skrár:** `app/hlada-upp/StorSkraClient.tsx`, `app/api/hljod-stort/route.ts`, `lib/ffmpeg/split.ts`
- Tab toggle í `app/hlada-upp/UploadTabs.tsx` skiptir á milli leiða 1 og 2

### 3. Taka upp í beinni (`/taka-upp` → `/api/hljod-hluti` + `/api/straumur`)
- Client tekur upp í 20s hlutum, sendir hvern hluta til server
- Server: transcribe → yfirferð → vista í DB → SSE straumur til client
- **Skrár:** `app/taka-upp/TakaUppClient.tsx`, `app/api/hljod-hluti/route.ts`, `app/api/straumur/route.ts`, `lib/pipeline/processChunk.ts`

### 4. Beinlína (`/beinlina` → `/api/beinlina` + `/api/beinlina-vista`)
- OpenAI Realtime API (gpt-4o-realtime-preview) í gegnum WebSocket
- Client talar beint við OpenAI, server býr til ephemeral token
- Vista: client sendir transcript → server býr til samantekt
- **Skrár:** `app/beinlina/BeinlinaClient.tsx`, `app/api/beinlina/route.ts`, `app/api/beinlina-vista/route.ts`

## Sameiginlegar einingar (varúð við breytingar)

Þessar skrár eru notaðar af öllum leiðum. Breytingar hér hafa áhrif á allt:

- `lib/pipeline/transcribe.ts` — transcription + prompt leak strip + hallucination strip
- `lib/pipeline/summarize.ts` — generateNotes + generateFinalSummary
- `lib/pipeline/prompts.ts` — öll system prompts (yfirferð + samantekt per profile)
- `lib/db/sessions.ts` — DB helpers (createSession, createChunk, createNote, etc.)
- `lib/db/schema.ts` — Drizzle schema
- `lib/email/send-summary.ts` — email með yfirferð + samantekt

## UI hugtök

- **Yfirferð** (áður "Glósur"): Per-chunk notes sameinaðar í eina heild. Birt sem eitt kort.
- **Uppskrift**: Hrátt transcribed text
- **Samantekt**: Ítarleg lokasamantekt með kaflaheitum, ákvarðanir, viðstöddum o.fl.

## Reglur

1. Ekki breyta leiðum 1-4 nema beðið sé sérstaklega um það
2. Sameiginlegar einingar: backwards-compatible breytingar eingöngu
3. Nýjar leiðir: nýr endpoint, nýr component — ekki blanda inn í núverandi
4. Merkja experimental virkni með `// EXPERIMENTAL` comment
5. Transcription: alltaf gpt-4o-transcribe fyrst, whisper-1 fallback
6. Email: bæði yfirferð og samantekt, ljós bakgrunnur (#ffffff), dökkur texti
