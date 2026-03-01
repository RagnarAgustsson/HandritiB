import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import { createSession, updateSession, createChunk, createNote } from '@/lib/db/sessions'
import { transcribeAudio } from '@/lib/pipeline/transcribe'
import { generateNotes, generateFinalSummary } from '@/lib/pipeline/summarize'
import { logAction } from '@/lib/db/admin'
import { sendSummaryEmail } from '@/lib/email/send-summary'
import { checkTranscriptionAccess } from '@/lib/subscription/check-access'
import { recordUsage } from '@/lib/db/usage'
import type { PromptProfile } from '@/lib/pipeline/prompts'

export const maxDuration = 300

// Áætluð orð á mínútu í íslensku tali
const WORDS_PER_MINUTE = 130

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ villa: 'Ekki innskráður' }, { status: 401 })

  const access = await checkTranscriptionAccess(userId)
  if (!access.allowed) {
    return NextResponse.json({ villa: access.reason }, { status: 403 })
  }

  let blobUrl: string | undefined

  try {
    const body = await request.json()
    blobUrl = body.blobUrl as string
    const filename = (body.filename as string) || 'hljod.webm'
    const profile = (body.profile as PromptProfile) || 'fundur'
    const nafn = (body.nafn as string) || ''
    const clientDuration = parseInt(body.lengd || '0')
    const fileSize = parseInt(body.fileSize || '0')

    if (!blobUrl) return NextResponse.json({ villa: 'Engin skrá' }, { status: 400 })

    // Fetch audio from Vercel Blob
    const blobRes = await fetch(blobUrl)
    if (!blobRes.ok) {
      return NextResponse.json({ villa: 'Tókst ekki að sækja skrá úr geymslu' }, { status: 500 })
    }

    const session = await createSession({
      userId,
      name: nafn || filename.replace(/\.[^/.]+$/, '') || 'Upphlöðun',
      profile,
      status: 'virkt',
    })

    const audioBlob = new Blob([await blobRes.arrayBuffer()], { type: blobRes.headers.get('content-type') || 'audio/webm' })
    const transcript = await transcribeAudio(audioBlob, filename)

    // Clean up blob now that we have the transcript
    del(blobUrl).catch(() => {})

    if (!transcript) {
      await updateSession(session.id, { status: 'villa' })
      return NextResponse.json({ villa: 'Tókst ekki að þýða hljóðið' }, { status: 500 })
    }

    const durationSeconds = clientDuration > 0
      ? clientDuration
      : Math.round((transcript.split(/\s+/).length / WORDS_PER_MINUTE) * 60)

    const chunk = await createChunk({ sessionId: session.id, seq: 0, transcript, durationSeconds })

    const { notes, rollingSummary } = await generateNotes(transcript, profile, [])
    await createNote({ sessionId: session.id, chunkId: chunk.id, content: notes, rollingSummary })

    const finalSummary = await generateFinalSummary([transcript], profile)
    await updateSession(session.id, { status: 'lokið', finalSummary, totalSeconds: durationSeconds })

    const periodStart = access.subscription?.currentPeriodStart || new Date()
    await recordUsage({ userId, sessionId: session.id, seconds: durationSeconds, source: 'hljod-skra', periodStart })

    const user = await currentUser()
    const email = user?.emailAddresses[0]?.emailAddress || ''
    const sizeLabel = fileSize > 0 ? `${(fileSize / 1024 / 1024).toFixed(1)}MB` : 'blob'
    await logAction(userId, email, 'skra.hlada', `${filename} (${sizeLabel})`)
    if (email && finalSummary) sendSummaryEmail(email, nafn || filename, finalSummary).catch(() => {})

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    // Clean up blob on error
    if (blobUrl) del(blobUrl).catch(() => {})
    const message = error instanceof Error ? error.message : 'Óþekkt villa'
    return NextResponse.json({ villa: message }, { status: 500 })
  }
}
