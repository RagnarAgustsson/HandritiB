import { auth, currentUser } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { openai } from '@/lib/openai/client'
import { logAction } from '@/lib/db/admin'
import { BEINLINA_INSTRUCTIONS } from '@/lib/pipeline/prompts'

// Issues an ephemeral token so the browser can connect directly to OpenAI Realtime.
// The API key never leaves the server.
export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ villa: 'Ekki innskráður' }, { status: 401 })

  const session = await (openai.beta as any).realtime.sessions.create({
    model: 'gpt-4o-realtime-preview',
    voice: 'alloy',
    instructions: BEINLINA_INSTRUCTIONS,
    input_audio_transcription: { model: 'whisper-1' },
    turn_detection: {
      type: 'server_vad',
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 800,
    },
  })

  const user = await currentUser()
  const email = user?.emailAddresses[0]?.emailAddress || ''
  await logAction(userId, email, 'beinlina.hefja')

  return NextResponse.json({
    client_secret: session.client_secret,
    session_id: session.id,
  })
}
