# Heilstaeð ryni a Handriti

## Samantekt

Handriti er vel skipulagt verkefni med 4 sjálfstaeðar leiðir, góðan pipeline, og traustan grunn. En eftir ítarlega rýni á UI/UX, backend, gagnagrunn, greiðslur og arkitektúr koma í ljós veikleikar sem skipta máli — sérstaklega varðandi áreiðanleika (reliability), öryggi greiðslna og aðgengi.

---

## ALVARLEGT (Critical) — Getur valdið gagnatapi eða fjárhagslegu tjóni

### 1. Paddle webhook: engin idempotency
- **Skrá:** `app/api/webhooks/paddle/route.ts`
- **Vandamál:** Paddle sendir webhooks aftur ef fyrsta tilraun mistekst. Engin vörn gegn tvíteknum events → tvöföld áskrift, rangt billing state
- **Lagfæring:** Bæta við `eventId` dedup töflu, athuga hvort event hafi þegar verið unnið

### 2. OpenAI API: engir retries
- **Skrá:** `lib/pipeline/transcribe.ts`
- **Vandamál:** Bæði gpt-4o-transcribe og whisper-1 fallback geta bilað á 429/5xx án þess að reyna aftur → gagnatap
- **Lagfæring:** Exponential backoff með jitter fyrir transient errors

### 3. Race condition í hljod-stort (stórar skrár)
- **Skrá:** `app/api/hljod-stort/route.ts`
- **Vandamál:** Chunk retrieval og summary generation eru ekki atomic — samhliða requests geta blandað gögnum
- **Lagfæring:** Nota `db.transaction()` í kringum summarize action

### 4. Trial subscription race condition
- **Skrá:** `lib/db/subscriptions.ts`
- **Vandamál:** Check-then-insert er ekki atomic — tveir concurrent requests geta búið til tvær prufuáskriftir
- **Lagfæring:** Nota `onConflictDoUpdate` á userId

### 5. Email: silent failures
- **Skrár:** Allar routes sem senda email
- **Vandamál:** `.catch(() => {})` — notandi veit aldrei hvort email barst
- **Lagfæring:** Skila email status til client, logga failures

---

## HÁTT (High) — Afköst, öryggi eða stöðugleiki í hættu

### 6. Engir database indexes
- **Skrá:** `lib/db/schema.ts`
- **Vandamál:** Ekkert index á `sessions.userId`, `chunks.sessionId`, `usageRecords.userId+periodStart` → full table scans
- **Lagfæring:** Bæta við indexes á öll foreign keys og oft-queried fields

### 7. /straumur: vantar maxDuration + connection timeout
- **Skrá:** `app/api/straumur/route.ts`
- **Vandamál:** SSE polling endar eftir Vercel default (60s), enginn timeout → DoS veikleiki
- **Lagfæring:** `export const maxDuration = 300` + setTimeout cleanup

### 8. Admin N+1 query
- **Skrá:** `app/api/admin/route.ts`
- **Vandamál:** 1 usage query per notanda (100 notendur = 100 queries)
- **Lagfæring:** Single aggregation query með GROUP BY

### 9. Usage recording: engin duplicate detection
- **Skrá:** `lib/db/usage.ts`
- **Vandamál:** Retry á client = tvöfalt recorded usage → rangar kvótar
- **Lagfæring:** Unique constraint á (userId, sessionId, source)

### 10. Database transactions vantar í multi-step ops
- **Skrár:** `app/api/lotur/route.ts`, `lib/pipeline/processChunk.ts`
- **Vandamál:** Session finalization les chunks → generates summary → updates session sem aðskildar ops
- **Lagfæring:** Vefja í `db.transaction()`

### 11. FFmpeg.wasm memory leak
- **Skrá:** `lib/ffmpeg/split.ts`
- **Vandamál:** Global instance cached en aldrei cleaned up → memory bloat
- **Lagfæring:** Bæta við cleanup logic og instance reset eftir notkun

### 12. BeinlinaClient: RTCPeerConnection ekki cleaned up
- **Skrá:** `app/[locale]/live/BeinlinaClient.tsx`
- **Vandamál:** Peer connection búin til en aldrei lokuð á unmount → resource leak
- **Lagfæring:** useEffect cleanup

---

## MIÐLUNGS (Medium) — Gæðamál, viðhald, UX

### 13. Aðgengi (Accessibility) — margt vantar
- **Vantar:** skip-to-content link, aria-pressed á profile takkum, role="tab" á flipum, aria-label á icon-only tökkunum (copy, delete, rename), role="progressbar" á UsageBanner, focus rings á öllum interactive elements
- **Vantar:** prefers-reduced-motion stuðningur á öllum framer-motion components
- **Vantar:** Arrow key navigation í LanguageSwitcher dropdown

### 14. Litastyrkur (Color contrast) — WCAG AA fails
- Nav links: zinc-400 á zinc-950 (~3.2:1, þarf 4.5:1)
- Footer: zinc-600 á zinc-950 (~1.7:1)
- Error/status texti: zinc-500 á zinc-950 (~2.2:1)
- 404 síða: h1 er zinc-800 á zinc-950 (nær ósýnilegt!)
- **Lagfæring:** Hækka í zinc-300/zinc-400 eftir atvikum

### 15. TypeScript type safety — 9 `any` tilvik
- `(openai.beta as any).realtime` í beinlina route
- `event.data as any` í Paddle webhook
- `(recorder as any)._interval` í TakaUppClient
- **Lagfæring:** Búa til proper types fyrir öll tilfelli

### 16. Code duplication
- `validateLocale()` skilgreind 3x í aðskildum routes (til í shared utils en ekki notuð)
- `sseEvent()` duplicated í hljod-skra og hljod-stort
- **Lagfæring:** Færa í `lib/api/utils.ts` og nota á öllum stöðum

### 17. Paddle API key logged
- **Skrá:** `app/api/paddle-checkout/route.ts:25`
- **Vandamál:** Key preview loggað — óþarfa exposure
- **Lagfæring:** Fjarlægja alla key-logging

### 18. Blob cleanup: fire-and-forget
- **Vandamál:** `del(blobUrl).catch(...)` — ef delete mistekst, blob situr eftir → kostnaður
- **Lagfæring:** Lifecycle rules eða cleanup job

### 19. Error response format ósamræmi
- Sumar routes skila `{ villa: "..." }`, aðrar `{ error: "..." }`
- **Lagfæring:** Samræma allt í `{ villa: "..." }`

### 20. Session cleanup vantar
- Sessions safnast upp endalaust í DB
- **Lagfæring:** Retention policy (90 dagar) með cleanup cron

### 21. Responsive: Nav overflow á litlum skjáum
- 5+ items í nav á 320px → overflow
- **Lagfæring:** Mobile hamburger menu eða collapse pattern

### 22. Caching strategy vantar
- Engin revalidation, engin cache headers á static pages
- **Lagfæring:** ISR og cache patterns

### 23. .env.example ófullkomið
- Vantar: BLOB_READ_WRITE_TOKEN, PADDLE_WEBHOOK_SECRET, RESEND_API_KEY, ADMIN_SEED_EMAIL
- **Lagfæring:** Skrá öll env vars

---

## VEL GERT — Styrkur verkefnisins

- 4 sjálfstæðar pipelines vel aðskildar
- Ownership checks á öllum routes
- Security headers í next.config.ts
- validateProfile/validateBlobUrl/safeErrorMessage í lib/pipeline/validate.ts
- Proper Clerk auth integration
- SSE streaming vel útfært (þó vantar maxDuration á /straumur)
- i18n með next-intl og 4 tungumálum
- Drizzle ORM með typed schema
- Dynamic imports á FFmpeg og þungum modules
- Error boundary (error.tsx) og not-found.tsx

---

## Forgangsröðun — Hvar á að byrja?

**Vika 1: Áreiðanleiki og öryggi**
1. Paddle webhook idempotency (#1)
2. Database indexes (#6)
3. OpenAI retries (#2)
4. Trial race condition (#4)

**Vika 2: Stöðugleiki**
5. /straumur maxDuration + timeout (#7)
6. DB transactions (#3, #10)
7. Usage dedup (#9)
8. FFmpeg + RTC cleanup (#11, #12)

**Vika 3: Gæði og aðgengi**
9. Accessibility fixes (#13)
10. Color contrast (#14)
11. TypeScript any removal (#15)
12. Code dedup (#16)

**Vika 4: Viðhald**
13. Email reliability (#5)
14. Structured logging
15. Caching strategy (#22)
16. Session cleanup (#20)
