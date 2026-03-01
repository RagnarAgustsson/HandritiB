import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createSession, createChunk, updateSession } from '@/lib/db/sessions'
import { generateFinalSummary } from '@/lib/pipeline/summarize'
import { logAction } from '@/lib/db/admin'
import { sendSummaryEmail } from '@/lib/email/send-summary'
import { getSubscription, createTrialSubscription } from '@/lib/db/subscriptions'
import { recordUsage } from '@/lib/db/usage'
import type { PromptProfile } from '@/lib/pipeline/prompts'

// Save a completed Realtime session transcript to the database
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ villa: 'Ekki innskráður' }, { status: 401 })

  const body = await request.json()
  const { transcript, profile = 'fundur', nafn, durationSeconds = 0 } = body

  if (!transcript || typeof transcript !== 'string') {
    return NextResponse.json({ villa: 'Vantar uppskrift' }, { status: 400 })
  }

  const session = await createSession({
    userId,
    name: nafn || `Beinlína ${new Date().toLocaleDateString('is-IS')}`,
    profile: profile as PromptProfile,
    status: 'virkt',
  })

  const duration = Math.round(durationSeconds)
  await createChunk({
    sessionId: session.id,
    seq: 0,
    transcript,
    durationSeconds: duration,
  })

  const finalSummary = await generateFinalSummary([transcript], profile as PromptProfile)
  await updateSession(session.id, { status: 'lokið', finalSummary, totalSeconds: duration })

  // Skrá notkun
  if (duration > 0) {
    let sub = await getSubscription(userId)
    if (!sub) sub = await createTrialSubscription(userId)
    const periodStart = sub.currentPeriodStart || sub.createdAt
    await recordUsage({ userId, sessionId: session.id, seconds: duration, source: 'beinlina', periodStart })
  }

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress || ''
  await logAction(userId, email, 'beinlina.vista', `Lota ${session.id}`)
  if (email && finalSummary) sendSummaryEmail(email, session.name, finalSummary).catch(() => {})

  return NextResponse.json({ sessionId: session.id, finalSummary })
}
