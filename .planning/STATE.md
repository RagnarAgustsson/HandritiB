# Project State

## Status
**Active milestone:** M1 — Initial Build
**Current phase:** All 5 phases complete
**Next action:** Create accounts → fill .env.local → `npm run db:migrate` → deploy to Vercel

## Phases
| # | Name | Status |
|---|------|--------|
| 1 | Foundation + Auth + Database | ✓ complete |
| 2 | Live Recording Flow | ✓ complete |
| 3 | File Upload Flow | ✓ complete |
| 4 | GPT Realtime Flow | ✓ complete |
| 5 | Polish + Deployment | ✓ complete |

## Stack (as built)
- Next.js 16 + TypeScript + Tailwind v4
- Clerk v6 (auth) — needs account at clerk.com
- Neon + Drizzle ORM (data) — needs account at neon.tech
- OpenAI SDK v6 (Whisper + GPT-4o + Realtime)
- Vercel (deployment)

## To get running
1. Copy `.env.example` → `.env.local` and fill in all values
2. Create Clerk app → paste NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY
3. Create Neon database → paste DATABASE_URL
4. Run `npm run db:generate && npm run db:migrate`
5. Run `npm run dev` to test locally
6. Deploy: `vercel --prod` or connect GitHub repo in Vercel dashboard

## Key decisions locked
- Stack: Next.js 16 + Clerk + Neon + Drizzle + OpenAI SDK + Vercel
- No FFmpeg — Whisper accepts webm natively
- No in-memory job queue — synchronous chunk processing
- No credit system for v1
- Icelandic throughout (UI + AI output)
- All API routes in Icelandic slugs (hljod-hluti, hlaða-upp, straumur, beinlina, lotur)

---
*Updated: 2026-02-28 — all phases complete*
