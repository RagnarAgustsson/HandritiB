import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createSession, updateSession } from '@/lib/db/sessions'
import { processChunk } from '@/lib/pipeline/processChunk'
import { generateFinalSummary } from '@/lib/pipeline/summarize'
import { splitAudioBuffer, getSupportedMimeType } from '@/lib/audio/splitter'
import type { PromptProfile } from '@/lib/pipeline/prompts'

export const maxDuration = 300

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ villa: 'Ekki innskráður' }, { status: 401 })

  const formData = await request.formData()
  const skrá = formData.get('skrá') as File | null
  const profile = (formData.get('profile') as PromptProfile) || 'fundur'
  const nafn = (formData.get('nafn') as string) || ''

  if (!skrá) return NextResponse.json({ villa: 'Engin skrá' }, { status: 400 })

  const session = await createSession({
    userId,
    name: nafn || skrá.name.replace(/\.[^/.]+$/, '') || 'Upphlöðun',
    profile,
    status: 'virkt',
  })

  try {
    const arrayBuffer = await skrá.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const chunks = splitAudioBuffer(buffer, skrá.name)
    const mimeType = getSupportedMimeType(skrá.name)

    const transcripts: string[] = []

    for (const chunk of chunks) {
      const ab = chunk.data.buffer.slice(
        chunk.data.byteOffset,
        chunk.data.byteOffset + chunk.data.byteLength
      ) as ArrayBuffer
      const blob = new Blob([ab], { type: mimeType })

      const result = await processChunk({
        sessionId: session.id,
        seq: chunk.index,
        audioBlob: blob,
        profile,
        durationSeconds: 0,
      })

      if (result.transcript) transcripts.push(result.transcript)
    }

    // Final summary
    const finalSummary = transcripts.length > 0
      ? await generateFinalSummary(transcripts, profile)
      : ''

    await updateSession(session.id, { status: 'lokið', finalSummary })

    return NextResponse.json({ sessionId: session.id, hlutaFjöldi: chunks.length })
  } catch (error) {
    await updateSession(session.id, { status: 'villa' })
    const message = error instanceof Error ? error.message : 'Óþekkt villa'
    return NextResponse.json({ villa: message }, { status: 500 })
  }
}
