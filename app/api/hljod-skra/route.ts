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

const encoder = new TextEncoder()

function sseEvent(data: object): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ villa: 'Ekki innskráður' }, { status: 401 })

  const access = await checkTranscriptionAccess(userId)
  if (!access.allowed) {
    return NextResponse.json({ villa: access.reason }, { status: 403 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ villa: 'Ógild fyrirspurn' }, { status: 400 })
  }

  const blobUrl = body.blobUrl as string
  const filename = (body.filename as string) || 'hljod.webm'
  const profile = (body.profile as PromptProfile) || 'fundur'
  const nafn = (body.nafn as string) || ''
  const clientDuration = parseInt((body.lengd as string) || '0')
  const fileSize = parseInt((body.fileSize as string) || '0')
  const ephemeral = body.ephemeral === true

  if (!blobUrl) return NextResponse.json({ villa: 'Engin skrá' }, { status: 400 })

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => controller.enqueue(sseEvent(data))

      try {
        // 1. Fetch audio from Vercel Blob
        send({ step: 'Sæki hljóðskrá...', progress: 10 })
        const blobToken = process.env.BLOB_READ_WRITE_TOKEN
        const blobRes = await fetch(blobUrl, {
          headers: { Authorization: `Bearer ${blobToken}` },
        })
        if (!blobRes.ok) {
          send({ step: 'villa', villa: `Tókst ekki að sækja skrá úr geymslu (${blobRes.status})` })
          controller.close()
          return
        }

        // 2. Create session (skip for ephemeral)
        let sessionId: string | null = null
        if (!ephemeral) {
          const session = await createSession({
            userId,
            name: nafn || filename.replace(/\.[^/.]+$/, '') || 'Upphlöðun',
            profile,
            status: 'virkt',
          })
          sessionId = session.id
        }

        // 3. Transcribe
        send({ step: 'Þýði hljóðskrá...', progress: 25 })
        const audioBlob = new Blob([await blobRes.arrayBuffer()], {
          type: blobRes.headers.get('content-type') || 'audio/webm',
        })
        const transcript = await transcribeAudio(audioBlob, filename)

        // Clean up blob
        del(blobUrl).catch((e) => console.error('[blob-delete]', blobUrl, e))

        if (!transcript) {
          if (sessionId) await updateSession(sessionId, { status: 'villa' })
          send({ step: 'villa', villa: 'Tókst ekki að þýða hljóðið' })
          controller.close()
          return
        }

        const durationSeconds = clientDuration > 0
          ? clientDuration
          : Math.round((transcript.split(/\s+/).length / WORDS_PER_MINUTE) * 60)

        if (!ephemeral && sessionId) {
          await createChunk({ sessionId, seq: 0, transcript, durationSeconds })
        }

        // 4. Generate notes (yfirferð)
        send({ step: 'Bý til yfirferð...', progress: 55 })
        const { notes } = await generateNotes(transcript, profile, [])
        if (!ephemeral && sessionId) {
          await createNote({ sessionId, content: notes })
        }

        // 5. Generate final summary
        send({ step: 'Tek saman...', progress: 75 })
        const finalSummary = await generateFinalSummary([transcript], profile)
        if (!ephemeral && sessionId) {
          await updateSession(sessionId, { status: 'lokið', finalSummary, totalSeconds: durationSeconds })
        }

        // 6. Usage, logging, email
        send({ step: 'Geng frá...', progress: 90 })
        const periodStart = access.subscription?.currentPeriodStart || new Date()
        await recordUsage({ userId, sessionId, seconds: durationSeconds, source: 'hljod-skra', periodStart })

        const user = await currentUser()
        const email = user?.emailAddresses[0]?.emailAddress || ''
        const sizeLabel = fileSize > 0 ? `${(fileSize / 1024 / 1024).toFixed(1)}MB` : 'blob'
        await logAction(userId, email, 'skra.hlada', `${filename} (${sizeLabel})${ephemeral ? ' [tímabundið]' : ''}`)
        if (email && finalSummary) sendSummaryEmail(email, nafn || filename, finalSummary, notes).catch(() => {})

        // Done
        send({
          step: 'lokið',
          progress: 100,
          sessionId,
          ...(ephemeral && { ephemeral: true, transcript, yfirferd: notes, samantekt: finalSummary }),
        })
        controller.close()
      } catch (error) {
        // Clean up blob on error
        del(blobUrl).catch((e) => console.error('[blob-delete]', blobUrl, e))
        const message = error instanceof Error ? error.message : 'Óþekkt villa'
        try {
          send({ step: 'villa', villa: message })
        } catch {
          // controller may already be closed
        }
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  })
}
