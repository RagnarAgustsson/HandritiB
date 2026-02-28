import { auth } from '@clerk/nextjs/server'
import { NextRequest } from 'next/server'
import { getSessionNotes, getSession } from '@/lib/db/sessions'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return new Response('Ekki innskráður', { status: 401 })

  const sessionId = request.nextUrl.searchParams.get('sessionId')
  if (!sessionId) return new Response('Vantar sessionId', { status: 400 })

  const session = await getSession(sessionId)
  if (!session || session.userId !== userId) return new Response('Lota finnst ekki', { status: 404 })

  let lastNoteCount = 0
  let lastSummary = ''

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(`data: ${JSON.stringify(data)}\n\n`)
      }

      const poll = async () => {
        try {
          const notes = await getSessionNotes(sessionId)

          if (notes.length > lastNoteCount) {
            const newNotes = notes.slice(lastNoteCount)
            for (const note of newNotes) {
              send({ tegund: 'glosa', efni: note.content, id: note.id })
            }
            lastNoteCount = notes.length
          }

          const latestSummary = notes[notes.length - 1]?.rollingSummary || ''
          if (latestSummary && latestSummary !== lastSummary) {
            send({ tegund: 'samantekt', efni: latestSummary })
            lastSummary = latestSummary
          }
        } catch {
          controller.close()
        }
      }

      const interval = setInterval(poll, 1500)

      request.signal.addEventListener('abort', () => {
        clearInterval(interval)
        controller.close()
      })

      await poll()
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
