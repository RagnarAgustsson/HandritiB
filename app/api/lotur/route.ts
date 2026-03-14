import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createSession, getUserSessions, updateSession, getSessionNotes, getSession, deleteSession, claimSessionForSummary } from '@/lib/db/sessions'
import { generateFinalSummary } from '@/lib/pipeline/summarize'
import { getSessionChunks } from '@/lib/db/sessions'
import { logAction } from '@/lib/db/admin'
import { sendSummaryEmail } from '@/lib/email/send-summary'
import { validateProfile } from '@/lib/pipeline/validate'
import { validateLocale } from '@/lib/api/utils'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ villa: 'Ekki innskráður' }, { status: 401 })

  const lotur = await getUserSessions(userId)
  return NextResponse.json({ lotur })
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ villa: 'Ekki innskráður' }, { status: 401 })

  const body = await request.json()
  const { nafn, profile } = body
  const locale = validateLocale(body.locale)

  const session = await createSession({
    userId,
    name: nafn || 'Óskilgreind lota',
    profile: validateProfile(profile),
    status: 'virkt',
    locale,
  })

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress || ''
  await logAction(userId, email, 'lota.stofna', `${session.name} (${session.profile})`)

  return NextResponse.json({ session })
}

export async function PATCH(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ villa: 'Ekki innskráður' }, { status: 401 })

  const body = await request.json()
  const { sessionId, aðgerð } = body

  // Eigandaprófun — tryggja að notandi eigi lotuna
  const session = await getSession(sessionId)
  if (!session || session.userId !== userId) {
    return NextResponse.json({ villa: 'Lota finnst ekki' }, { status: 404 })
  }

  if (aðgerð === 'ljúka') {
    const chunks = await getSessionChunks(sessionId)
    const transcripts = chunks.map(c => c.transcript).filter(Boolean)

    // Read locale from the session
    const sessionLocale = validateLocale((session as Record<string, unknown>).locale)

    let finalSummary = ''
    if (transcripts.length > 0) {
      finalSummary = await generateFinalSummary(transcripts, validateProfile(session.profile), sessionLocale)
    }

    const updated = await claimSessionForSummary(sessionId, { finalSummary })
    if (!updated) {
      return NextResponse.json({ villa: 'Lota er þegar lokið eða í vinnslu' }, { status: 409 })
    }

    const user = await currentUser()
    const email = user?.emailAddresses[0]?.emailAddress || ''
    await logAction(userId, email, 'lota.ljuka', `Lota ${sessionId}`)
    let emailSent = false
    if (email && finalSummary) {
      const notes = await getSessionNotes(sessionId)
      const yfirferd = notes.map(n => n.content).join('\n\n')
      const emailResult = await sendSummaryEmail(email, updated.name, finalSummary, yfirferd || undefined, sessionLocale)
      emailSent = emailResult.sent
    }

    return NextResponse.json({ session: updated, emailSent })
  }

  if (aðgerð === 'endurnefna' && body.nafn) {
    const nafnStr = String(body.nafn).slice(0, 500)
    const updated = await updateSession(sessionId, { name: nafnStr })

    const user = await currentUser()
    const email = user?.emailAddresses[0]?.emailAddress || ''
    await logAction(userId, email, 'lota.endurnefna', `${sessionId} → ${body.nafn}`)

    return NextResponse.json({ session: updated })
  }

  return NextResponse.json({ villa: 'Óþekkt aðgerð' }, { status: 400 })
}

export async function DELETE(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ villa: 'Ekki innskráður' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const sessionId = searchParams.get('sessionId')
  if (!sessionId) return NextResponse.json({ villa: 'Vantar sessionId' }, { status: 400 })

  const session = await getSession(sessionId)
  if (!session || session.userId !== userId) {
    return NextResponse.json({ villa: 'Lota finnst ekki' }, { status: 404 })
  }

  await deleteSession(sessionId)

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress || ''
  await logAction(userId, email, 'lota.eyda', `Lota ${sessionId}`)

  return NextResponse.json({ ok: true })
}
