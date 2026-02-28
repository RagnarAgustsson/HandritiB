import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createSession, updateSession, createChunk, createNote } from '@/lib/db/sessions'
import { transcribeAudio } from '@/lib/pipeline/transcribe'
import { generateNotes, generateFinalSummary } from '@/lib/pipeline/summarize'
import { logAction } from '@/lib/db/admin'
import { sendSummaryEmail } from '@/lib/email/send-summary'
import type { PromptProfile } from '@/lib/pipeline/prompts'

export const maxDuration = 300

// OpenAI Whisper/gpt-4o-transcribe accepts up to 25MB per file
const MAX_BYTES = 24 * 1024 * 1024

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ villa: 'Ekki innskráður' }, { status: 401 })

  try {
    const formData = await request.formData()
    const skrá = formData.get('skrá') as File | null
    const profile = (formData.get('profile') as PromptProfile) || 'fundur'
    const nafn = (formData.get('nafn') as string) || ''

    if (!skrá) return NextResponse.json({ villa: 'Engin skrá' }, { status: 400 })

    if (skrá.size > MAX_BYTES) {
      return NextResponse.json({
        villa: `Skráin er of stór (${(skrá.size / 1024 / 1024).toFixed(0)}MB). Hámark er 24MB. Reyndu að þjappa skránni eða notaðu "Taka upp" fyrir lengri fundi.`,
      }, { status: 400 })
    }

    const session = await createSession({
      userId,
      name: nafn || skrá.name.replace(/\.[^/.]+$/, '') || 'Upphlöðun',
      profile,
      status: 'virkt',
    })

    // Send the whole file to OpenAI — no byte-slicing
    const audioBlob = new Blob([await skrá.arrayBuffer()], { type: skrá.type || 'audio/webm' })
    const transcript = await transcribeAudio(audioBlob, skrá.name)

    if (!transcript) {
      await updateSession(session.id, { status: 'villa' })
      return NextResponse.json({ villa: 'Tókst ekki að þýða hljóðið' }, { status: 500 })
    }

    const chunk = await createChunk({ sessionId: session.id, seq: 0, transcript, durationSeconds: 0 })

    const { notes, rollingSummary } = await generateNotes(transcript, profile, [])
    await createNote({ sessionId: session.id, chunkId: chunk.id, content: notes, rollingSummary })

    const finalSummary = await generateFinalSummary([transcript], profile)
    await updateSession(session.id, { status: 'lokið', finalSummary })

    const user = await currentUser()
    const email = user?.emailAddresses[0]?.emailAddress || ''
    await logAction(userId, email, 'skra.hlada', `${skrá.name} (${(skrá.size / 1024 / 1024).toFixed(1)}MB)`)
    if (email && finalSummary) sendSummaryEmail(email, nafn || skrá.name, finalSummary).catch(() => {})

    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Óþekkt villa'
    return NextResponse.json({ villa: message }, { status: 500 })
  }
}
