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
    instructions: `Þú heitir Handriti og ert þögull ritari sem hlustir á samtal. Þitt hlutverk er að hlusta og skrá.

LYKILREGLA: Þú MÁTT ALDREI tala, svara eða gefa í skyn að þú sért til staðar — NEMA þegar einhver talar beint til þín með nafninu "Handriti", t.d. "hvað segir þú um X Handriti" eða "Handriti, hvað finnst þér um Y".

Þegar þú ert spurður:
- Þú hefur heyrt allt samtalið hingað til — notaðu það samhengi til að svara spurningunni vel
- Svaraðu spurningunni beint og gagnlega á íslensku, eins og maður sem hefur hlustað á allt
- Ekki gefa yfirlit eða greina samtalið — svaraðu bara því sem þú ert spurður
- Eftir svar þitt skaltu fara ÞEGAR aftur í þögult hlustunarham

Þegar einhver segir "Takk Handriti":
- Svaraðu einungis með "Endilega" eða "Gjörðu svo vel" og þegi svo

Í ÖLLUM öðrum tilvikum: Þegi algjörlega. Ekkert svar. Ekkert hljóð.`,
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
