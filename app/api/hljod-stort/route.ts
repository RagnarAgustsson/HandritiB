// EXPERIMENTAL: stórar skrár — client-orchestrated chunked processing
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { del } from '@vercel/blob'
import { createSession, updateSession, createChunk, createNote, getSession, getSessionChunks } from '@/lib/db/sessions'
import { transcribeAudio } from '@/lib/pipeline/transcribe'
import { generateNotes, generateFinalSummary } from '@/lib/pipeline/summarize'
import { logAction } from '@/lib/db/admin'
import { sendSummaryEmail } from '@/lib/email/send-summary'
import { checkTranscriptionAccess } from '@/lib/subscription/check-access'
import { recordUsage } from '@/lib/db/usage'
import type { PromptProfile } from '@/lib/pipeline/prompts'

export const maxDuration = 300

const encoder = new TextEncoder()
const WORDS_PER_MINUTE = 130

function sseEvent(data: object): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
}

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ villa: 'Ekki innskráður' }, { status: 401 })

  const body = await request.json()
  const action = body.action as string

  // ── action: start ─────────────────────────────────────
  if (action === 'start') {
    const access = await checkTranscriptionAccess(userId)
    if (!access.allowed) {
      return NextResponse.json({ villa: access.reason }, { status: 403 })
    }

    const profile = (body.profile as PromptProfile) || 'fundur'
    const nafn = (body.nafn as string) || 'Stór skrá'

    const session = await createSession({
      userId,
      name: nafn,
      profile,
      status: 'virkt',
    })

    return NextResponse.json({ sessionId: session.id })
  }

  // ── action: transcribe ────────────────────────────────
  if (action === 'transcribe') {
    const sessionId = body.sessionId as string
    const blobUrl = body.blobUrl as string
    const seq = body.seq as number
    const filename = (body.filename as string) || 'chunk.webm'

    if (!sessionId || !blobUrl || seq === undefined) {
      return NextResponse.json({ villa: 'Vantar sessionId, blobUrl eða seq' }, { status: 400 })
    }

    // Verify ownership
    const session = await getSession(sessionId)
    if (!session || session.userId !== userId) {
      return NextResponse.json({ villa: 'Lota finnst ekki' }, { status: 404 })
    }

    try {
      // Fetch from blob
      const blobToken = process.env.BLOB_READ_WRITE_TOKEN
      const blobRes = await fetch(blobUrl, {
        headers: { Authorization: `Bearer ${blobToken}` },
      })
      if (!blobRes.ok) {
        return NextResponse.json({ villa: `Tókst ekki að sækja hluta (${blobRes.status})` }, { status: 500 })
      }

      const audioBlob = new Blob([await blobRes.arrayBuffer()], {
        type: blobRes.headers.get('content-type') || 'audio/webm',
      })

      const transcript = await transcribeAudio(audioBlob, filename)

      // Clean up blob
      del(blobUrl).catch(() => {})

      if (!transcript) {
        return NextResponse.json({ villa: `Tókst ekki að þýða hluta ${seq}` }, { status: 500 })
      }

      const durationSeconds = Math.round((transcript.split(/\s+/).length / WORDS_PER_MINUTE) * 60)
      await createChunk({ sessionId, seq, transcript, durationSeconds })

      return NextResponse.json({ ok: true })
    } catch (error) {
      del(blobUrl).catch(() => {})
      const message = error instanceof Error ? error.message : 'Óþekkt villa'
      return NextResponse.json({ villa: message }, { status: 500 })
    }
  }

  // ── action: summarize ─────────────────────────────────
  if (action === 'summarize') {
    const sessionId = body.sessionId as string
    const fileSize = parseInt(body.fileSize || '0')
    const filename = (body.filename as string) || 'stor-skra'

    if (!sessionId) {
      return NextResponse.json({ villa: 'Vantar sessionId' }, { status: 400 })
    }

    const session = await getSession(sessionId)
    if (!session || session.userId !== userId) {
      return NextResponse.json({ villa: 'Lota finnst ekki' }, { status: 404 })
    }

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => controller.enqueue(sseEvent(data))

        try {
          // Read all chunks
          send({ step: 'Les hluta...', progress: 10 })
          const allChunks = await getSessionChunks(sessionId)
          if (allChunks.length === 0) {
            send({ step: 'villa', villa: 'Engir hlutar fundust' })
            controller.close()
            return
          }

          const allTranscripts = allChunks.map(c => c.transcript)
          const totalSeconds = allChunks.reduce((sum, c) => sum + c.durationSeconds, 0)

          // Generate notes per-chunk with rolling context (like live recording)
          const previousTranscripts: string[] = []
          const allNotes: string[] = []
          for (let i = 0; i < allChunks.length; i++) {
            send({ step: `Bý til yfirferð (${i + 1}/${allChunks.length})...`, progress: 30 + Math.round((i / allChunks.length) * 25) })
            const { notes, rollingSummary } = await generateNotes(allChunks[i].transcript, session.profile as PromptProfile, previousTranscripts)
            await createNote({ sessionId, chunkId: allChunks[i].id, content: notes, rollingSummary })
            allNotes.push(notes)
            previousTranscripts.push(allChunks[i].transcript)
          }

          // Generate final summary
          send({ step: 'Tek saman...', progress: 60 })
          const finalSummary = await generateFinalSummary(allTranscripts, session.profile as PromptProfile)
          await updateSession(sessionId, { status: 'lokið', finalSummary, totalSeconds })

          // Usage, logging, email
          send({ step: 'Geng frá...', progress: 85 })
          const access = await checkTranscriptionAccess(userId)
          const periodStart = access.subscription?.currentPeriodStart || new Date()
          await recordUsage({ userId, sessionId, seconds: totalSeconds, source: 'hljod-skra', periodStart })

          const user = await currentUser()
          const email = user?.emailAddresses[0]?.emailAddress || ''
          const sizeLabel = fileSize > 0 ? `${(fileSize / 1024 / 1024).toFixed(1)}MB` : 'blob'
          await logAction(userId, email, 'skra.stort', `${filename} (${sizeLabel}, ${allChunks.length} hlutar)`)
          if (email && finalSummary) {
            const yfirferd = allNotes.join('\n\n')
            await sendSummaryEmail(email, session.name, finalSummary, yfirferd).catch(() => {})
          }

          send({ step: 'lokið', progress: 100, sessionId })
          controller.close()
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Óþekkt villa'
          try { send({ step: 'villa', villa: message }) } catch { /* */ }
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

  return NextResponse.json({ villa: 'Óþekkt action' }, { status: 400 })
}
