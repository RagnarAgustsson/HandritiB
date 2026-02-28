# Technology Stack

**Project:** Handriti (Icelandic audio transcription rewrite)
**Researched:** 2026-02-28
**Knowledge cutoff:** August 2025 — versions marked LOW confidence should be verified with `npm show [package] version`

---

## Recommended Stack

### Core Framework

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Next.js | 15.x | Full-stack framework, API routes, App Router | Claude knows it well; App Router Server Components reduce client bundle; Vercel deploys it natively with zero config |
| React | 19.x | UI layer | Ships with Next.js 15; concurrent features available but not required |
| TypeScript | 5.x | Type safety | Enables Claude Code to autocomplete and catch errors; keep strict mode off for ease of vibe-coding |

**Confidence:** MEDIUM — Next.js 15 was released stable in late 2024 and is the current major; React 19 shipped alongside it. Verify exact patch versions.

**Next.js App Router usage stance:** Use App Router but with restraint. Server Components for data-fetching pages, Client Components for audio recording UI. Avoid Edge Runtime — Whisper file uploads require Node.js runtime (`export const runtime = 'nodejs'`). Avoid deeply nested layouts. One root layout, minimal nested layouts.

---

### Authentication

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @clerk/nextjs | 6.x | Auth, session, user management | Pre-decided. Clerk's App Router middleware handles session propagation automatically; no custom cookie logic needed |

**Confidence:** MEDIUM — Clerk v6 for Next.js App Router was the current major SDK as of mid-2025. Verify with `npm show @clerk/nextjs version`.

**Pattern:** Use `clerkMiddleware()` in `middleware.ts` with `createRouteMatcher` to protect routes. Use `auth()` from `@clerk/nextjs/server` in Server Components and Route Handlers. Never roll custom session logic.

```typescript
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)'])

export default clerkMiddleware((auth, req) => {
  if (!isPublicRoute(req)) auth().protect()
})

export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
}
```

---

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @neondatabase/serverless | 0.9.x | Neon Postgres connection driver | Pre-decided. Neon's serverless driver uses HTTP/WebSocket for Vercel serverless functions — avoids TCP connection exhaustion that pgx-style drivers cause in serverless |
| drizzle-orm | 0.36.x | Query builder + schema definition | Pre-decided. Type-safe SQL without the magic of Prisma; schema-as-code is readable at a glance; migrations are plain SQL |
| drizzle-kit | 0.27.x | Schema migrations, introspection | CLI companion to drizzle-orm; generates SQL migrations from schema changes |

**Confidence:** LOW on versions — verify all three. Drizzle has shipped rapidly. Pattern confidence is HIGH.

**Pattern:** Define schema in `src/db/schema.ts`, export `db` instance from `src/db/index.ts`, use `drizzle(neon(process.env.DATABASE_URL!))`.

```typescript
// src/db/index.ts
import { drizzle } from 'drizzle-orm/neon-http'
import { neon } from '@neondatabase/serverless'
import * as schema from './schema'

const sql = neon(process.env.DATABASE_URL!)
export const db = drizzle(sql, { schema })
```

```typescript
// src/db/schema.ts
import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const sessions = pgTable('sessions', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: text('user_id').notNull(), // Clerk user ID
  title: text('title'),
  transcript: text('transcript'),
  summary: text('summary'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
```

**Migration workflow:** `drizzle-kit push` for development (directly applies schema), `drizzle-kit generate` + `drizzle-kit migrate` for production.

---

### AI / Transcription / Summarization

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| openai | 4.x | Whisper transcription, GPT-4o summarization, Realtime | Official SDK handles streaming, retries, type-safe responses. Raw fetch requires manual error handling and streaming parsing. SDK is significantly less code. |

**Confidence:** MEDIUM — openai SDK v4 was stable and current as of mid-2025. The SDK gained native Realtime API support in v4.x. Verify exact version.

**Whisper pattern:** POST audio file to `/api/transcribe` route handler. Use `formData()` to extract the file blob and pass directly to `openai.audio.transcriptions.create()`. No FFmpeg required for most browser-recorded audio (webm/opus is accepted by Whisper API directly).

```typescript
// src/app/api/transcribe/route.ts
import { auth } from '@clerk/nextjs/server'
import OpenAI from 'openai'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'
export const maxDuration = 60

const openai = new OpenAI()

export async function POST(req: Request) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await req.formData()
  const file = formData.get('audio') as File

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: 'whisper-1',
    language: 'is', // Icelandic
  })

  return NextResponse.json({ text: transcription.text })
}
```

**GPT-4o streaming pattern:** Use `openai.chat.completions.create({ stream: true })` and return a `ReadableStream` via `NextResponse`. The SDK's `.toReadableStream()` converts the async iterator directly.

**Realtime API pattern:** Use `openai.beta.realtime` via WebSocket in a client component. The Realtime API requires a client-side WebSocket — route this through a Next.js Route Handler that returns the WebSocket URL with an ephemeral token, never expose the API key to the client.

---

### File Handling (Audio Uploads)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Native `FormData` + Next.js Route Handler | — | Receive audio file uploads | No library needed. Next.js 15 Route Handlers accept `req.formData()` natively. Keep it simple. |

**No FFmpeg on client — approach:**

For live recording (chunked): Browser records via `MediaRecorder` API, sends 10-30 second chunks as `webm/opus` blobs to the transcription API. Whisper accepts webm directly. No encoding needed.

For file uploads: Accept `webm`, `mp3`, `mp4`, `m4a`, `wav`. Whisper API accepts all of these natively. For files over 25MB (Whisper's limit): Either enforce a client-side size limit (`NEXT_PUBLIC_MAX_UPLOAD_MB=25`) or implement server-side chunking without FFmpeg using the Web Streams API to split binary data at silence boundaries. For v1, enforce the 25MB limit — simpler, honest.

**What NOT to do:** Do not use `@ffmpeg/ffmpeg` WASM on the client. It ships a ~30MB binary, causes COOP/COEP header requirements that break Clerk's auth popups, and is the single biggest maintenance burden in the existing app.

---

### UI

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Tailwind CSS | 4.x | Styling | Zero-config with Next.js 15; v4 uses CSS-native configuration (no `tailwind.config.js` required for basic use); excellent Claude Code support |
| shadcn/ui | latest | Component primitives | Not a package — copy-paste components. Accessible, Tailwind-based, no version lock-in. Use for buttons, dialogs, cards. Claude knows every component by heart. |
| lucide-react | 0.x | Icons | Already in the existing app; lightweight, tree-shakeable |

**Confidence:** MEDIUM — Tailwind v4 shipped in early 2025. Verify compatibility with your Next.js version. shadcn/ui is always "latest" by design.

**Tailwind v4 note:** Configuration moves from `tailwind.config.js` to a `@theme` block in your global CSS file. This is a breaking change from v3. If you hit issues, pinning to Tailwind v3 is acceptable.

---

### State Management

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| React `useState` / `useReducer` | — | Local component state | Sufficient for audio recording UI state (recording, paused, processing) |
| React Context | — | Cross-component session state | Session transcript, notes, summary shared across page. No external library needed. |

**What NOT to use:** Zustand, Jotai, Redux — all add indirection. This app's state is per-session and shallow. Context + hooks is readable at a glance, which is the primary constraint.

---

### Deployment & Infrastructure

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Vercel | — | Hosting, serverless functions, streaming | Pre-decided. Next.js deploys to Vercel with zero config. Supports streaming responses for GPT output. Function timeout up to 60s on Pro plan (needed for long Whisper jobs). |
| Neon | — | Postgres database | Pre-decided. Neon's serverless Postgres has a generous free tier and HTTP-based connection that is compatible with Vercel's serverless function cold-start model. |

**Vercel constraints to know:**
- Default function timeout: 10s (Hobby), 60s (Pro). Long audio transcription will exceed 10s. Either use Pro plan or implement a background job pattern (see PITFALLS).
- Max request body size: 4.5MB by default. Override with `export const config = { api: { bodyParser: { sizeLimit: '25mb' } } }` in Route Handler config, or use multipart streaming.
- Edge Runtime does NOT support Node.js `Buffer`, `fs`, or native modules. Always use `export const runtime = 'nodejs'` on routes that touch OpenAI or files.

---

### Developer Tooling

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| ESLint | 9.x | Linting | Next.js ships with it; minimal config |
| Prettier | 3.x | Formatting | One-time setup, no ongoing decisions |
| Vitest | 2.x | Unit tests | Already in the existing app; fast, Jest-compatible API |

**What NOT to add:** Husky, lint-staged, commitlint, Storybook, Turborepo, Docker — all add overhead with no benefit for a solo/Claude-driven codebase.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Auth | Clerk | Supabase Auth | Supabase combines auth + DB + RLS in a way that's hard to debug in isolation. Clerk is auth-only, independent of DB layer. |
| Auth | Clerk | NextAuth.js (Auth.js) | NextAuth requires more configuration and custom adapter setup for Neon/Drizzle. Clerk is faster to set up and maintain. |
| DB Client | @neondatabase/serverless | pg / postgres.js | Standard TCP-based drivers don't work well in serverless (connection pool exhaustion). Neon's driver uses HTTP/WS specifically for this constraint. |
| DB Client | @neondatabase/serverless | Prisma | Prisma's query engine is an additional binary that can cause cold-start issues on Vercel. Drizzle is pure JS, no binary. |
| ORM | Drizzle | Prisma | Prisma is more "magic" — schema in `.prisma` files, generated client, shadow database for migrations. Drizzle is TypeScript-native and readable without background knowledge. |
| Styling | Tailwind CSS | CSS Modules | Tailwind has better Claude Code support — components are self-contained and don't require jumping between files. |
| Styling | Tailwind CSS | styled-components / Emotion | No CSS-in-JS — adds runtime overhead and complicates RSC. |
| AI Audio | OpenAI SDK | Raw fetch | SDK is 60% less code for the same result and handles streaming, retries, and type-safe errors. Raw fetch was fine for v1 but scales poorly. |
| File Upload | Native FormData | UploadThing / Uploadcare | Third-party upload services add another auth layer and cost. For 25MB max, native Next.js Route Handlers are sufficient. |
| State | React Context | Zustand | Zustand is excellent but overkill here — one session, shallow state, no cross-route state sharing needed. |

---

## Environment Variables

```bash
# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/

# Database
DATABASE_URL=postgresql://...  # Neon connection string (use pooled URL for serverless)

# OpenAI
OPENAI_API_KEY=sk-...
OPENAI_TRANSCRIBE_MODEL=whisper-1
OPENAI_NOTES_MODEL=gpt-4o
OPENAI_SUMMARY_MODEL=gpt-4o

# App config
NEXT_PUBLIC_MAX_UPLOAD_MB=25
```

**Note on Neon URLs:** Neon provides two connection strings — pooled (port 5432 via PgBouncer) and direct (standard Postgres). Use pooled URL for all app queries (`DATABASE_URL`). Use direct URL only for `drizzle-kit migrate` (`DATABASE_URL_UNPOOLED`). The serverless driver's HTTP mode bypasses this distinction, but it is good practice.

---

## Installation

```bash
# Create Next.js 15 app
npx create-next-app@latest handriti --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

# Auth
npm install @clerk/nextjs

# Database
npm install drizzle-orm @neondatabase/serverless
npm install -D drizzle-kit

# AI
npm install openai

# UI primitives (shadcn - run after Tailwind is set up)
npx shadcn@latest init
npx shadcn@latest add button card dialog textarea

# Icons
npm install lucide-react
```

---

## What NOT to Use

| Package | Reason |
|---------|--------|
| `@ffmpeg/ffmpeg` | WASM binary breaks COOP/COEP headers required by Clerk auth popups. 30MB bundle hit. Not needed if Whisper accepts webm directly. |
| `@supabase/supabase-js` | Replaced by Clerk + Neon + Drizzle. Do not import. |
| `next-pwa` | PWA adds service worker complexity. Out of scope for v1. |
| `web-push` | Push notifications are out of scope for v1. |
| `resend` | Email is out of scope for v1. |
| `music-metadata` | Only needed if introspecting audio files server-side. Defer unless required for chunking logic. |
| Edge Runtime | Breaks Node.js APIs used by OpenAI SDK. Always use `runtime = 'nodejs'` on AI routes. |
| `axios` | Native `fetch` is sufficient in Next.js 15. Axios adds 12KB for no gain. |

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Next.js 15 + App Router | MEDIUM | Stable since Oct 2024; patterns well-established. Exact patch version unverified. |
| Clerk v6 for Next.js | MEDIUM | Was current major as of mid-2025. Verify `npm show @clerk/nextjs version`. |
| Drizzle + Neon serverless | MEDIUM | Pattern is well-established and recommended in Neon docs. Versions may have bumped. |
| OpenAI SDK v4 | MEDIUM | SDK v4 was stable; Realtime API support added in 4.x. Verify latest. |
| Tailwind CSS v4 | LOW | v4 shipped early 2025 with CSS-native config. Behavior may differ from training data. If unstable with Next.js 15, fall back to Tailwind v3. |
| No-FFmpeg approach | HIGH | Whisper API accepts webm/opus directly — this is documented OpenAI behavior. |
| Vercel serverless constraints | HIGH | Function timeout limits and body size limits are well-documented and stable. |

---

## Sources

- OpenAI Whisper API docs (training data, August 2025): accepts webm, mp3, mp4, m4a, wav, up to 25MB
- Clerk Next.js quickstart (training data): `clerkMiddleware` pattern is current SDK pattern
- Neon serverless driver README (training data): HTTP-based connection recommended for serverless
- Drizzle ORM docs (training data): `drizzle(neon(url))` is the canonical setup
- Vercel function limits (training data): 10s Hobby, 60s Pro, 4.5MB default body size
- Next.js 15 release notes (training data): App Router, React 19, nodejs runtime default

**Verification needed before coding starts:**
```bash
npm show next version
npm show @clerk/nextjs version
npm show drizzle-orm version
npm show drizzle-kit version
npm show @neondatabase/serverless version
npm show openai version
npm show tailwindcss version
```
