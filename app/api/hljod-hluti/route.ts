import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { processChunk } from '@/lib/pipeline/processChunk'
import { getSession } from '@/lib/db/sessions'
import { checkTranscriptionAccess } from '@/lib/subscription/check-access'
import { recordUsage } from '@/lib/db/usage'
import { validateProfile, safeErrorMessage, sanitizeUserContext } from '@/lib/pipeline/validate'
import { validateLocale } from '@/lib/api/utils'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ villa: 'Ekki innskráður' }, { status: 401 })

  const access = await checkTranscriptionAccess(userId)
  if (!access.allowed) {
    return NextResponse.json({ villa: access.reason }, { status: 403 })
  }

  const formData = await request.formData()
  const hljod = formData.get('hljod') as File | null
  const sessionId = formData.get('sessionId') as string | null
  const seq = parseInt(formData.get('seq') as string || '0')
  const ephemeral = formData.get('ephemeral') === 'true'
  const profile = validateProfile(formData.get('profile'))
  const locale = validateLocale(formData.get('locale'))
  const userContext = sanitizeUserContext(formData.get('userContext')) || undefined

  if (!hljod || (!ephemeral && !sessionId)) {
    return NextResponse.json({ villa: 'Vantar hljóð eða lotunúmer' }, { status: 400 })
  }

  let sessionProfile = profile
  let sessionLocale = locale
  if (!ephemeral && sessionId) {
    const session = await getSession(sessionId)
    if (!session || session.userId !== userId) {
      return NextResponse.json({ villa: 'Lota finnst ekki' }, { status: 404 })
    }
    sessionProfile = validateProfile(session.profile)
    sessionLocale = validateLocale((session as Record<string, unknown>).locale)
  }

  // Parse previous transcripts for ephemeral context
  let previousTranscripts: string[] | undefined
  const prevJson = formData.get('previousTranscripts') as string | null
  if (ephemeral && prevJson) {
    try { previousTranscripts = JSON.parse(prevJson) } catch { /* */ }
  }

  const audioBlob = new Blob([await hljod.arrayBuffer()], { type: hljod.type || 'audio/webm' })
  const durationSeconds = Math.round(parseFloat(formData.get('seconds') as string || '0'))

  try {
    const result = await processChunk({
      sessionId: ephemeral ? null : sessionId,
      seq,
      audioBlob,
      profile: sessionProfile,
      durationSeconds,
      filename: hljod.name,
      ephemeral,
      previousTranscripts,
      locale: sessionLocale,
      userContext,
    })

    // Skrá notkun
    if (durationSeconds > 0) {
      const periodStart = access.subscription?.currentPeriodStart || new Date()
      await recordUsage({ userId, sessionId: ephemeral ? null : sessionId, seconds: durationSeconds, source: 'hljod-hluti', periodStart })
    }

    return NextResponse.json(result)
  } catch (error) {
    const message = safeErrorMessage(error)
    return NextResponse.json({ villa: message }, { status: 500 })
  }
}
