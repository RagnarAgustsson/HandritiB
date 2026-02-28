import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { createSession, createChunk, updateSession } from '@/lib/db/sessions'
import { generateFinalSummary } from '@/lib/pipeline/summarize'
import type { PromptProfile } from '@/lib/pipeline/prompts'

// Save a completed Realtime session transcript to the database
export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ villa: 'Ekki innskráður' }, { status: 401 })

  const body = await request.json()
  const { transcript, profile = 'fundur', nafn } = body

  if (!transcript || typeof transcript !== 'string') {
    return NextResponse.json({ villa: 'Vantar uppskrift' }, { status: 400 })
  }

  const session = await createSession({
    userId,
    name: nafn || `Beinlína ${new Date().toLocaleDateString('is-IS')}`,
    profile: profile as PromptProfile,
    status: 'virkt',
  })

  await createChunk({
    sessionId: session.id,
    seq: 0,
    transcript,
    durationSeconds: 0,
  })

  const finalSummary = await generateFinalSummary([transcript], profile as PromptProfile)
  await updateSession(session.id, { status: 'lokið', finalSummary })

  return NextResponse.json({ sessionId: session.id, finalSummary })
}
