import { NextRequest, NextResponse } from 'next/server'
import { cleanupOldSessions } from '@/lib/db/sessions'

/**
 * Cron endpoint for session cleanup.
 * Deletes completed sessions older than 90 days.
 * Protected by CRON_SECRET env var.
 *
 * Vercel cron: add to vercel.json:
 * { "crons": [{ "path": "/api/cron/cleanup", "schedule": "0 3 * * 0" }] }
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ villa: 'Ekki heimild' }, { status: 401 })
  }

  const deleted = await cleanupOldSessions(90)
  console.log(`[cron/cleanup] Deleted ${deleted} sessions older than 90 days`)

  return NextResponse.json({ ok: true, deleted })
}
