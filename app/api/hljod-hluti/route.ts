import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { processChunk } from '@/lib/pipeline/processChunk'
import { getSession } from '@/lib/db/sessions'
import type { PromptProfile } from '@/lib/pipeline/prompts'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ villa: 'Ekki innskráður' }, { status: 401 })

  const formData = await request.formData()
  const hljod = formData.get('hljod') as File | null
  const sessionId = formData.get('sessionId') as string | null
  const seq = parseInt(formData.get('seq') as string || '0')

  if (!hljod || !sessionId) {
    return NextResponse.json({ villa: 'Vantar hljóð eða lotunúmer' }, { status: 400 })
  }

  const session = await getSession(sessionId)
  if (!session || session.userId !== userId) {
    return NextResponse.json({ villa: 'Lota finnst ekki' }, { status: 404 })
  }

  const audioBlob = new Blob([await hljod.arrayBuffer()], { type: hljod.type || 'audio/webm' })

  const result = await processChunk({
    sessionId,
    seq,
    audioBlob,
    profile: session.profile as PromptProfile,
    durationSeconds: Math.round(parseFloat(formData.get('seconds') as string || '0')),
  })

  return NextResponse.json(result)
}
