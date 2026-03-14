// EXPERIMENTAL: stórar skrár — client-orchestrated chunked processing
import { auth, currentUser } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createSession, updateSession, createChunk, createNote, getSession, getSessionChunks, claimSessionForSummary } from '@/lib/db/sessions'
import { transcribeAudio } from '@/lib/pipeline/transcribe'
import { generateNotes, generateFinalSummary } from '@/lib/pipeline/summarize'
import { logAction } from '@/lib/db/admin'
import { sendSummaryEmail } from '@/lib/email/send-summary'
import { checkTranscriptionAccess } from '@/lib/subscription/check-access'
import { recordUsage } from '@/lib/db/usage'
import { validateProfile, validateBlobUrl, safeErrorMessage, sanitizeUserContext } from '@/lib/pipeline/validate'
import { validateLocale, sseEvent, deleteBlob } from '@/lib/api/utils'

export const maxDuration = 300

const WORDS_PER_MINUTE = 130

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

    const profile = validateProfile(body.profile)
    const nafn = (body.nafn as string) || 'Stór skrá'
    const locale = validateLocale(body.locale)

    const session = await createSession({
      userId,
      name: nafn,
      profile,
      status: 'virkt',
      locale,
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
    const locale = validateLocale(body.locale)

    if ((!ephemeral && !sessionId) || !blobUrl || seq === undefined) {
      return NextResponse.json({ villa: 'Vantar blobUrl eða seq' }, { status: 400 })
    }

    if (!validateBlobUrl(blobUrl)) {
      return NextResponse.json({ villa: 'Ógild skrá' }, { status: 400 })
    }

    // Verify ownership (skip for ephemeral)
    let sessionLocale = locale
    if (!ephemeral) {
      const session = await getSession(sessionId!)
      if (!session || session.userId !== userId) {
        return NextResponse.json({ villa: 'Lota finnst ekki' }, { status: 404 })
      }
      sessionLocale = validateLocale((session as Record<string, unknown>).locale)
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

      const transcript = await transcribeAudio(audioBlob, filename, sessionLocale)

      // Clean up blob
      deleteBlob(blobUrl)

      if (!transcript) {
        return NextResponse.json({ villa: `Tókst ekki að þýða hluta ${seq}` }, { status: 500 })
      }

      const durationSeconds = Math.round((transcript.split(/\s+/).length / WORDS_PER_MINUTE) * 60)
      if (!ephemeral && sessionId) {
        await createChunk({ sessionId, seq, transcript, durationSeconds })
      }

      return NextResponse.json({ ok: true, transcript, durationSeconds })
    } catch (error) {
      deleteBlob(blobUrl)
      return NextResponse.json({ villa: safeErrorMessage(error) }, { status: 500 })
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
    const locale = validateLocale(body.locale)
    const userContext = sanitizeUserContext(body.userContext) || undefined

    if (!ephemeral && !sessionId) {
      return NextResponse.json({ villa: 'Vantar sessionId' }, { status: 400 })
    }

    let sessionProfile = validateProfile(body.profile)
    let sessionName = nafn
    let sessionLocale = locale

    if (!ephemeral && sessionId) {
      const session = await getSession(sessionId)
      if (!session || session.userId !== userId) {
        return NextResponse.json({ villa: 'Lota finnst ekki' }, { status: 404 })
      }
      sessionProfile = validateProfile(session.profile)
      sessionName = session.name
      sessionLocale = validateLocale((session as Record<string, unknown>).locale)
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
            send({ step: 'fetching', progress: 10 })
            const allChunks = await getSessionChunks(sessionId!)
            if (allChunks.length === 0) {
              send({ step: 'error', villa: 'Engir hlutar fundust' })
              controller.close()
              return
            }
            allTranscripts = allChunks.map(c => c.transcript)
            totalSeconds = allChunks.reduce((sum, c) => sum + c.durationSeconds, 0)
          }

          if (allTranscripts.length === 0) {
            send({ step: 'error', villa: 'Engir textar fundust' })
            controller.close()
            return
          }

          // Generate notes per-chunk with rolling context
          const previousTranscripts: string[] = []
          const allNotes: string[] = []
          for (let i = 0; i < allTranscripts.length; i++) {
            send({ step: 'generating_notes', progress: 30 + Math.round((i / allTranscripts.length) * 25), current: i + 1, total: allTranscripts.length })
            const { notes, rollingSummary } = await generateNotes(allTranscripts[i], sessionProfile, previousTranscripts, sessionLocale, userContext)
            if (!ephemeral && sessionId) {
              await createNote({ sessionId, content: notes, rollingSummary })
            }
            allNotes.push(notes)
            previousTranscripts.push(allTranscripts[i])
          }

          // Generate final summary
          send({ step: 'summarizing', progress: 60 })
          const finalSummary = await generateFinalSummary(allTranscripts, sessionProfile, sessionLocale, userContext)
          if (!ephemeral && sessionId) {
            const claimed = await claimSessionForSummary(sessionId, { finalSummary, totalSeconds })
            if (!claimed) {
              send({ step: 'error', villa: 'Lota er þegar í vinnslu' })
              controller.close()
              return
            }
          }

          // Usage, logging, email
          send({ step: 'sending_email', progress: 85 })
          const access = await checkTranscriptionAccess(userId)
          const periodStart = access.subscription?.currentPeriodStart || new Date()
          await recordUsage({ userId, sessionId: sessionId || null, seconds: totalSeconds, source: 'hljod-skra', periodStart })

          const user = await currentUser()
          const email = user?.emailAddresses[0]?.emailAddress || ''
          const sizeLabel = fileSize > 0 ? `${(fileSize / 1024 / 1024).toFixed(1)}MB` : 'blob'
          await logAction(userId, email, 'skra.stort', `${filename} (${sizeLabel}, ${allTranscripts.length} hlutar)${ephemeral ? ' [tímabundið]' : ''}`)
          let emailSent = false
          if (email && finalSummary) {
            const yfirferd = allNotes.join('\n\n')
            const emailResult = await sendSummaryEmail(email, sessionName, finalSummary, yfirferd, sessionLocale)
            emailSent = emailResult.sent
          }

          send({
            step: 'done',
            progress: 100,
            sessionId: sessionId || null,
            emailSent,
            ...(ephemeral && { ephemeral: true, transcript: allTranscripts.join('\n\n'), yfirferd: allNotes.join('\n\n'), samantekt: finalSummary }),
          })
          controller.close()
        } catch (error) {
          const message = safeErrorMessage(error)
          try { send({ step: 'error', villa: message }) } catch { /* */ }
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
