import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createSession, getUserSessions, updateSession } from '@/lib/db/sessions'
import { generateFinalSummary } from '@/lib/pipeline/summarize'
import { getSessionChunks } from '@/lib/db/sessions'
import { logAction } from '@/lib/db/admin'
import { sendSummaryEmail } from '@/lib/email/send-summary'
import type { PromptProfile } from '@/lib/pipeline/prompts'

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

  const session = await createSession({
    userId,
    name: nafn || 'Óskilgreind lota',
    profile: (profile as PromptProfile) || 'fundur',
    status: 'virkt',
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

  if (aðgerð === 'ljúka') {
    const chunks = await getSessionChunks(sessionId)
    const transcripts = chunks.map(c => c.transcript).filter(Boolean)

    let finalSummary = ''
    if (transcripts.length > 0) {
      const session = await import('@/lib/db/sessions').then(m => m.getSession(sessionId))
      finalSummary = await generateFinalSummary(transcripts, (session?.profile || 'fundur') as PromptProfile)
    }

    const updated = await updateSession(sessionId, { status: 'lokið', finalSummary })

    const user = await currentUser()
    const email = user?.emailAddresses[0]?.emailAddress || ''
    await logAction(userId, email, 'lota.ljuka', `Lota ${sessionId}`)
    if (email && finalSummary) sendSummaryEmail(email, updated.name, finalSummary).catch(() => {})

    return NextResponse.json({ session: updated })
  }

  if (aðgerð === 'endurnefna' && body.nafn) {
    const updated = await updateSession(sessionId, { name: body.nafn })

    const user = await currentUser()
    const email = user?.emailAddresses[0]?.emailAddress || ''
    await logAction(userId, email, 'lota.endurnefna', `${sessionId} → ${body.nafn}`)

    return NextResponse.json({ session: updated })
  }

  return NextResponse.json({ villa: 'Óþekkt aðgerð' }, { status: 400 })
}
