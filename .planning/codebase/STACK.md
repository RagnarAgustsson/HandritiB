# Technology Stack

**Analysis Date:** 2026-02-28

## Languages

**Primary:**
- TypeScript 5.6.3 - Application code, API routes, client components
- JavaScript - Configuration files, service worker

**Secondary:**
- SQL - Supabase migrations and schema definitions

## Runtime

**Environment:**
- Node.js 18+ (inferred from Next.js 14 and modern features)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` present

## Frameworks

**Core:**
- Next.js 14.2.5 - Full-stack React framework with App Router
- React 18.3.1 - UI components and client state

**PWA/Service Worker:**
- next-pwa 5.6.0 - Progressive Web App generation and caching

**Testing:**
- Vitest 2.1.1 - Unit test runner (Node environment)

**Build/Dev:**
- TypeScript 5.6.3 - Type checking (`tsc --noEmit`)

## Key Dependencies

**Critical:**
- @supabase/supabase-js 2.57.4 - Postgres client and authentication
- @supabase/ssr 0.7.0 - Server-side rendering with Supabase auth
- next-pwa 5.6.0 - Progressive Web App for offline support

**AI/ML:**
- (No direct SDK) - OpenAI API calls via native `fetch()` to `https://api.openai.com/v1/*`

**Email:**
- resend 6.1.0 - Email delivery service (purchase receipts)

**Push Notifications:**
- web-push 3.6.7 - Web push protocol for notifications

**Audio Processing:**
- @ffmpeg/ffmpeg 0.12.15 - Client-side audio encoding/transcoding
- @ffmpeg-installer/ffmpeg 1.1.0 - FFmpeg binary installer
- ffmpeg-static 5.2.0 - Fallback FFmpeg static binary
- music-metadata 11.9.0 - Extract audio metadata and duration

**UI:**
- lucide-react 0.460.0 - Icon library

**Utilities:**
- braces 3.0.3 - Bracket expansion utility

## Configuration

**Environment:**
- `.env.local` (development) and Vercel environment variables (production)
- No `.env.example` committed but referenced in README

**Key Variables:**
- `OPENAI_API_KEY` - Required for transcription and chat
- `OPENAI_MODEL` - Chat completions model (defaults to `gpt-5`)
- `OPENAI_NOTES_MODEL` - Rolling notes generation (defaults to `gpt-4.1`)
- `OPENAI_SUMMARY_MODEL` - Final summary generation (defaults to `gpt-5`)
- `OPENAI_TRANSCRIBE_MODEL` - Transcription model (defaults to `gpt-4o-transcribe`)
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Client auth key (public)
- `SUPABASE_SERVICE_KEY` - Server-only admin key
- `RESEND_API_KEY` - Email service API key
- `EMAIL_FROM` - Sender email address for receipts
- `WEB_PUSH_PUBLIC_KEY` - VAPID public key for push notifications
- `WEB_PUSH_PRIVATE_KEY` - VAPID private key for push notifications
- `WEB_PUSH_CONTACT` - Contact email for push service (defaults to `mailto:admin@example.com`)
- `NEXT_PUBLIC_MAX_UPLOAD_MB` - Client-side max upload size (defaults to 100MB)
- `MAX_UPLOAD_MB` - Server-side max upload size (defaults to 100MB)
- `LARGE_UPLOAD_PRIMARY_SECONDS` - Audio segment duration configuration
- `LARGE_UPLOAD_MAX_SEGMENTS` - Maximum segments per upload
- `LARGE_UPLOAD_MAX_BYTES` - Maximum bytes per segment
- `LARGE_UPLOAD_FALLBACK_NORMALIZE` - Audio normalization fallback format
- `LARGE_UPLOAD_NORMALIZE_FORMAT` - Target audio format (webm/ogg/wav)
- `LARGE_UPLOAD_SEGMENT_STRATEGY` - Segmentation strategy (copy/wav/auto)
- `FFMPEG_PATH` - Custom FFmpeg binary location
- `DEBUG_SAVE_LARGE_SUMMARY` - Save final summaries to `/tmp/handriti-transcripts` when `1`
- `DEBUG_SAVE_LARGE_TRANSCRIPT` - Save transcripts to filesystem when `1`
- `PIPELINE_FORCE_SYNC` - Run queue jobs immediately when `1` (dev/test only)
- `PIPELINE_QUEUE_DEBUG` - Log queue activity when `1`
- `ENABLE_ROLLING_SUMMARIES` - Enable periodic rolling summary updates when `1`
- `CHUNK_CONTEXT_PREVIOUS` - Number of previous chunks to include in prompt (defaults to 1)

**Build:**
- `next.config.js` - PWA caching strategies, server actions, file tracing
- `tsconfig.json` - Strict TypeScript, ES2020 target, path aliases (`@/*`)
- `vitest.config.ts` - Node environment test runner

## Platform Requirements

**Development:**
- Node.js 18+
- npm or yarn
- FFmpeg binary (auto-installed via `@ffmpeg-installer/ffmpeg` or `ffmpeg-static`)

**Production:**
- Vercel (deployment target, as referenced in README and next.config PWA logic)
- Postgres database via Supabase
- OpenAI API access
- Resend account (for email, optional)
- Web push VAPID keys (for notifications, optional)

---

*Stack analysis: 2026-02-28*
