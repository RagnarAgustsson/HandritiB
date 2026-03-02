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

    const ephemeral = body.ephemeral === true
    if (ephemeral) {
      return NextResponse.json({ ephemeral: true })
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
    const sessionId = body.sessionId as string | undefined
    const blobUrl = body.blobUrl as string
    const seq = body.seq as number
    const filename = (body.filename as string) || 'chunk.webm'
    const ephemeral = body.ephemeral === true

    if ((!ephemeral && !sessionId) || !blobUrl || seq === undefined) {
      return NextResponse.json({ villa: 'Vantar blobUrl eða seq' }, { status: 400 })
    }

    // Verify ownership (skip for ephemeral)
    if (!ephemeral) {
      const session = await getSession(sessionId!)
      if (!session || session.userId !== userId) {
        return NextResponse.json({ villa: 'Lota finnst ekki' }, { status: 404 })
      }
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
      del(blobUrl).catch((e) => console.error('[blob-delete]', blobUrl, e))

      if (!transcript) {
        return NextResponse.json({ villa: `Tókst ekki að þýða hluta ${seq}` }, { status: 500 })
      }

      const durationSeconds = Math.round((transcript.split(/\s+/).length / WORDS_PER_MINUTE) * 60)
      if (!ephemeral && sessionId) {
        await createChunk({ sessionId, seq, transcript, durationSeconds })
      }

      return NextResponse.json({ ok: true, transcript, durationSeconds })
    } catch (error) {
      del(blobUrl).catch((e) => console.error('[blob-delete]', blobUrl, e))
      const message = error instanceof Error ? error.message : 'Óþekkt villa'
      return NextResponse.json({ villa: message }, { status: 500 })
    }
  }

  // ── action: summarize ─────────────────────────────────
  if (action === 'summarize') {
    const sessionId = body.sessionId as string | undefined
    const fileSize = parseInt(body.fileSize || '0')
    const filename = (body.filename as string) || 'stor-skra'
    const nafn = (body.nafn as string) || filename
    const ephemeral = body.ephemeral === true
    const clientTranscripts = (body.transcripts as string[]) || []
    const clientDurations = (body.durations as number[]) || []

    if (!ephemeral && !sessionId) {
      return NextResponse.json({ villa: 'Vantar sessionId' }, { status: 400 })
    }

    let sessionProfile: PromptProfile = (body.profile as PromptProfile) || 'fundur'
    let sessionName = nafn

    if (!ephemeral && sessionId) {
      const session = await getSession(sessionId)
      if (!session || session.userId !== userId) {
        return NextResponse.json({ villa: 'Lota finnst ekki' }, { status: 404 })
      }
      sessionProfile = session.profile as PromptProfile
      sessionName = session.name
    }

    const stream = new ReadableStream({
      async start(controller) {
        const send = (data: object) => controller.enqueue(sseEvent(data))

        try {
          // Get transcripts
          let allTranscripts: string[]
          let totalSeconds: number

          if (ephemeral) {
            allTranscripts = clientTranscripts.filter(Boolean)
            totalSeconds = clientDurations.reduce((sum, d) => sum + d, 0)
          } else {
            send({ step: 'Les hluta...', progress: 10 })
            const allChunks = await getSessionChunks(sessionId!)
            if (allChunks.length === 0) {
              send({ step: 'villa', villa: 'Engir hlutar fundust' })
              controller.close()
              return
            }
            allTranscripts = allChunks.map(c => c.transcript)
            totalSeconds = allChunks.reduce((sum, c) => sum + c.durationSeconds, 0)
          }

          if (allTranscripts.length === 0) {
            send({ step: 'villa', villa: 'Engir textar fundust' })
            controller.close()
            return
          }

          // Generate notes per-chunk with rolling context
          const previousTranscripts: string[] = []
          const allNotes: string[] = []
          for (let i = 0; i < allTranscripts.length; i++) {
            send({ step: `Bý til yfirferð (${i + 1}/${allTranscripts.length})...`, progress: 30 + Math.round((i / allTranscripts.length) * 25) })
            const { notes, rollingSummary } = await generateNotes(allTranscripts[i], sessionProfile, previousTranscripts)
            if (!ephemeral && sessionId) {
              await createNote({ sessionId, content: notes, rollingSummary })
            }
            allNotes.push(notes)
            previousTranscripts.push(allTranscripts[i])
          }

          // Generate final summary
          send({ step: 'Tek saman...', progress: 60 })
          const finalSummary = await generateFinalSummary(allTranscripts, sessionProfile)
          if (!ephemeral && sessionId) {
            await updateSession(sessionId, { status: 'lokið', finalSummary, totalSeconds })
          }

          // Usage, logging, email
          send({ step: 'Geng frá...', progress: 85 })
          const access = await checkTranscriptionAccess(userId)
          const periodStart = access.subscription?.currentPeriodStart || new Date()
          await recordUsage({ userId, sessionId: sessionId || null, seconds: totalSeconds, source: 'hljod-skra', periodStart })

          const user = await currentUser()
          const email = user?.emailAddresses[0]?.emailAddress || ''
          const sizeLabel = fileSize > 0 ? `${(fileSize / 1024 / 1024).toFixed(1)}MB` : 'blob'
          await logAction(userId, email, 'skra.stort', `${filename} (${sizeLabel}, ${allTranscripts.length} hlutar)${ephemeral ? ' [tímabundið]' : ''}`)
          if (email && finalSummary) {
            const yfirferd = allNotes.join('\n\n')
            sendSummaryEmail(email, sessionName, finalSummary, yfirferd).catch(() => {})
          }

          send({
            step: 'lokið',
            progress: 100,
            sessionId: sessionId || null,
            ...(ephemeral && { ephemeral: true, transcript: allTranscripts.join('\n\n'), yfirferd: allNotes.join('\n\n'), samantekt: finalSummary }),
          })
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
