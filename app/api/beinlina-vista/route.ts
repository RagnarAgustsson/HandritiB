import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createSession, createChunk, updateSession } from '@/lib/db/sessions'
import { generateNotes, generateFinalSummary } from '@/lib/pipeline/summarize'
import { logAction } from '@/lib/db/admin'
import { sendSummaryEmail } from '@/lib/email/send-summary'
import { getSubscription, createTrialSubscription } from '@/lib/db/subscriptions'
import { checkTranscriptionAccess } from '@/lib/subscription/check-access'
import { recordUsage } from '@/lib/db/usage'
import { validateProfile, sanitizeUserContext } from '@/lib/pipeline/validate'
import { formatDate } from '@/i18n/config'
import { validateLocale } from '@/lib/api/utils'

// Save a completed Realtime session transcript to the database
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ villa: 'Ekki innskráður' }, { status: 401 })

  const access = await checkTranscriptionAccess(userId)
  if (!access.allowed) {
    return NextResponse.json({ villa: access.reason }, { status: 403 })
  }

  const body = await request.json()
  const { transcript, profile: rawProfile, nafn, durationSeconds = 0, ephemeral: isEphemeral = false } = body
  const profile = validateProfile(rawProfile)
  const locale = validateLocale(body.locale)
  const userContext = sanitizeUserContext(body.userContext) || undefined

  if (!transcript || typeof transcript !== 'string') {
    return NextResponse.json({ villa: 'Vantar uppskrift' }, { status: 400 })
  }

  const duration = Math.round(durationSeconds)
  const sessionName = nafn || `Beinlína ${formatDate(new Date())}`
  let sessionId: string | null = null

  if (!isEphemeral) {
    const session = await createSession({
      userId,
      name: sessionName,
      profile,
      status: 'virkt',
      locale,
    })
    sessionId = session.id

    await createChunk({ sessionId, seq: 0, transcript, durationSeconds: duration })
  }

  const { notes: yfirferd } = await generateNotes(transcript, profile, [], locale, userContext)
  const finalSummary = await generateFinalSummary([transcript], profile, locale, userContext)

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
  let emailSent = false
  if (email && finalSummary) {
    const emailResult = await sendSummaryEmail(email, sessionName, finalSummary, yfirferd, locale)
    emailSent = emailResult.sent
  }

  return NextResponse.json({
    sessionId,
    finalSummary,
    emailSent,
    ...(isEphemeral && { ephemeral: true, transcript, yfirferd, samantekt: finalSummary }),
  })
}
