import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createSession, createChunk, updateSession } from '@/lib/db/sessions'
import { generateNotes, generateFinalSummary } from '@/lib/pipeline/summarize'
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
  const { transcript, profile = 'fundur', nafn, durationSeconds = 0, ephemeral: isEphemeral = false } = body

  if (!transcript || typeof transcript !== 'string') {
    return NextResponse.json({ villa: 'Vantar uppskrift' }, { status: 400 })
  }

  const duration = Math.round(durationSeconds)
  const sessionName = nafn || `Beinlína ${new Date().toLocaleDateString('is-IS')}`
  let sessionId: string | null = null

  if (!isEphemeral) {
    const session = await createSession({
      userId,
      name: sessionName,
      profile: profile as PromptProfile,
      status: 'virkt',
    })
    sessionId = session.id

    await createChunk({ sessionId, seq: 0, transcript, durationSeconds: duration })
  }

  const { notes: yfirferd } = await generateNotes(transcript, profile as PromptProfile, [])
  const finalSummary = await generateFinalSummary([transcript], profile as PromptProfile)

  if (!isEphemeral && sessionId) {
    await updateSession(sessionId, { status: 'lokið', finalSummary, totalSeconds: duration })
  }

  // Skrá notkun
  if (duration > 0) {
    let sub = await getSubscription(userId)
    if (!sub) sub = await createTrialSubscription(userId)
    const periodStart = sub.currentPeriodStart || sub.createdAt
    await recordUsage({ userId, sessionId, seconds: duration, source: 'beinlina', periodStart })
  }

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress || ''
  await logAction(userId, email, 'beinlina.vista', `${sessionId || 'tímabundið'}${isEphemeral ? ' [tímabundið]' : ''}`)
  if (email && finalSummary) sendSummaryEmail(email, sessionName, finalSummary, yfirferd).catch(() => {})

  return NextResponse.json({
    sessionId,
    finalSummary,
    ...(isEphemeral && { ephemeral: true, transcript, yfirferd, samantekt: finalSummary }),
  })
}
