import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { openai } from '@/lib/openai/client'

// Issues an ephemeral token so the browser can connect directly to OpenAI Realtime.
// The API key never leaves the server.
export async function POST() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ villa: 'Ekki innskráður' }, { status: 401 })

  const session = await (openai.beta as any).realtime.sessions.create({
    model: 'gpt-4o-realtime-preview',
    voice: 'alloy',
    instructions: `Þú heitir Handriti. Samtalið sem þú hlustir á er á ÍSLENSKU. Þú svarar alltaf á íslensku.

EIN REGLA, engar undantekningar: Þú talar EINUNGIS þegar einhver segir bókstaflega orðið "Handriti" í setningunni sinni — t.d. "hvað segir þú um X Handriti" eða "Handriti hvað finnst þér um Y". Ef orðið "Handriti" er ekki sagt: ÞEGI. Algert þögn. Engin viðbrögð. Ekkert hljóð.

Þegar orðið "Handriti" er sagt:
- Svaraðu því sem var spurt, stuttlega og beint, á íslensku
- Notaðu allt samhengi samtalsins til að svara vel
- Farðu þegar aftur í algera þögn eftir svarið

Þegar einhver segir "Takk Handriti": svaraðu einungis "Endilega" og þegi.`,
    input_audio_transcription: { model: 'whisper-1' },
    turn_detection: {
      type: 'server_vad',
      threshold: 0.5,
      prefix_padding_ms: 300,
      silence_duration_ms: 800,
    },
  })

  return NextResponse.json({
    client_secret: session.client_secret,
    session_id: session.id,
  })
}
