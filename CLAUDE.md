# Handriti — Guardrails

## Þrjár stöðugar leiðir (EKKI breyta)

Eftirfarandi þrjár leiðir eru í production og virka. **Ekki breyta þeim** nema beðið sé sérstaklega um það.

### 1. Hlaða upp skrá (`/hlada-upp` → `/api/hljod-skra`)
- Client velur skrá (≤24MB), hleður í Vercel Blob, sendir blob URL til server
- Server: sækir blob → transcribe (gpt-4o-transcribe, whisper-1 fallback) → glósur → samantekt → email
- Streaming SSE progress til client
- **Skrár:** `app/hlada-upp/HlaðaUppClient.tsx`, `app/api/hljod-skra/route.ts`, `app/api/blob-upload/route.ts`

### 2. Taka upp í beinni (`/taka-upp` → `/api/hljod-hluti` + `/api/straumur`)
- Client tekur upp í 20s hlutum, sendir hvern hluta til server
- Server: transcribe → glósur → vista í DB → SSE straumur til client
- **Skrár:** `app/taka-upp/TakaUppClient.tsx`, `app/api/hljod-hluti/route.ts`, `app/api/straumur/route.ts`, `lib/pipeline/processChunk.ts`

### 3. Beinlína (`/beinlina` → `/api/beinlina` + `/api/beinlina-vista`)
- OpenAI Realtime API (gpt-4o-realtime-preview) í gegnum WebSocket
- Client talar beint við OpenAI, server býr til ephemeral token
- Vista: client sendir transcript → server býr til glósur + samantekt
- **Skrár:** `app/beinlina/BeinlinaClient.tsx`, `app/api/beinlina/route.ts`, `app/api/beinlina-vista/route.ts`

## Sameiginlegar einingar (varúð við breytingar)

Þessar skrár eru notaðar af öllum leiðum. Breytingar hér hafa áhrif á allt:

- `lib/pipeline/transcribe.ts` — transcription + hallucination strip
- `lib/pipeline/summarize.ts` — generateNotes + generateFinalSummary
- `lib/pipeline/prompts.ts` — öll system prompts
- `lib/db/sessions.ts` — DB helpers (createSession, createChunk, createNote, etc.)
- `lib/db/schema.ts` — Drizzle schema

## Fjórða leiðin: Stórar skrár (EXPERIMENTAL)

Þessi leið er í þróun. Markmiðið er að styðja skrár stærri en 24MB með því að klippa þær niður client-megin og líma saman transcriptin á server.

**Reglur:**
1. Þetta verður **ný leið** — ekki breyta leiðum 1-3
2. Nýr API endpoint (t.d. `/api/hljod-stort`) — ekki blanda inn í `/api/hljod-skra`
3. Nýr client component eða mode í upload — ekki blanda saman í núverandi `senda()` flow
4. Má endurnýta `transcribeAudio()`, `generateNotes()`, `generateFinalSummary()` úr sameiginlegum einingum
5. Ef sameiginleg eining þarf breytingu, gera hana backwards-compatible
6. Merkja allt sem tengist þessari leið með `// EXPERIMENTAL: stórar skrár` comment
