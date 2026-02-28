'use client'

import { useState, useRef, useEffect } from 'react'
import { Zap, Square, Loader2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Staða = 'biðröð' | 'tengist' | 'í-gangi' | 'vistar' | 'villa'
type Message = { type: 'user' | 'handriti'; text: string }

export default function BeinlinaClient() {
  const router = useRouter()
  const [staða, setStaða] = useState<Staða>('biðröð')
  const [villa, setVilla] = useState('')
  const [messages, setMessages] = useState<Message[]>([])

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  async function byrja() {
    setVilla('')
    setMessages([])
    setStaða('tengist')

    try {
      const tokenRes = await fetch('/api/beinlina', { method: 'POST' })
      if (!tokenRes.ok) throw new Error('Gat ekki fengið aðgangslykilinn')
      const { client_secret } = await tokenRes.json()

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      const pc = new RTCPeerConnection()
      pcRef.current = pc

      stream.getAudioTracks().forEach(track => pc.addTrack(track, stream))

      pc.ontrack = (e) => {
        const audio = new Audio()
        audio.srcObject = e.streams[0]
        audio.play().catch(() => {})
      }

      const dc = pc.createDataChannel('oai-events')
      dcRef.current = dc

      dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data)
          // User speech transcript
          if (event.type === 'conversation.item.input_audio_transcription.completed' && event.transcript?.trim()) {
            setMessages(prev => [...prev, { type: 'user', text: event.transcript.trim() }])
          }
          // Handriti's spoken response transcript
          if (event.type === 'response.audio_transcript.done' && event.transcript?.trim()) {
            setMessages(prev => [...prev, { type: 'handriti', text: event.transcript.trim() }])
          }
        } catch {
          // ignore malformed events
        }
      }

      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      const sdpRes = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${client_secret.value}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      })

      if (!sdpRes.ok) throw new Error('Tenging við OpenAI mistókst')

      const answerSdp = await sdpRes.text()
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })

      setStaða('í-gangi')
    } catch (err) {
      setVilla(err instanceof Error ? err.message : 'Óþekkt villa')
      setStaða('villa')
      loka()
    }
  }

  function loka() {
    dcRef.current?.close()
    pcRef.current?.close()
    streamRef.current?.getTracks().forEach(t => t.stop())
    pcRef.current = null
    dcRef.current = null
    streamRef.current = null
  }

  async function stöðva() {
    loka()
    const userLines = messages.filter(m => m.type === 'user').map(m => m.text)
    if (userLines.length === 0) {
      setStaða('biðröð')
      return
    }
    setStaða('vistar')

    // Build full conversation transcript for context
    const fullTranscript = messages
      .map(m => m.type === 'handriti' ? `[Handriti]: ${m.text}` : m.text)
      .join('\n\n')

    const res = await fetch('/api/beinlina-vista', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: fullTranscript, profile: 'fundur' }),
    })
    const data = await res.json()
    if (res.ok) router.push(`/lotur/${data.sessionId}`)
    else {
      setVilla(data.villa || 'Villa við vistun')
      setStaða('villa')
    }
  }

  useEffect(() => () => loka(), [])

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-zinc-100 mb-8">Beinlína</h1>

        {(staða === 'biðröð' || staða === 'villa') && (
          <div className="space-y-6">
            <p className="text-zinc-500 text-sm">
              Handriti hlustir í þögn og skráir samtalið. Hér er hvernig þú talar við það:
            </p>

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-indigo-400 font-mono text-sm shrink-0 mt-0.5">→</span>
                <div>
                  <p className="text-sm font-medium text-zinc-200">"Hvað segir þú um X, Handriti?"</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Handriti svarar spurningunni með öllu samhengi samtalsins í huga</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-indigo-400 font-mono text-sm shrink-0 mt-0.5">→</span>
                <div>
                  <p className="text-sm font-medium text-zinc-200">"Takk Handriti"</p>
                  <p className="text-xs text-zinc-500 mt-0.5">Handriti þegir og hlustir áfram</p>
                </div>
              </div>
            </div>

            {villa && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {villa}
              </div>
            )}

            <button
              onClick={byrja}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-white font-semibold hover:bg-indigo-700 transition"
            >
              <Zap className="h-5 w-5" />
              Byrja beinlínu
            </button>
          </div>
        )}

        {staða === 'tengist' && (
          <div className="flex items-center gap-3 text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Tengist...
          </div>
        )}

        {staða === 'í-gangi' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-indigo-400 animate-pulse" />
                <span className="font-semibold text-zinc-100">Í beinlínu</span>
              </div>
              <button
                onClick={stöðva}
                className="flex items-center gap-2 rounded-xl bg-zinc-800 px-5 py-2.5 text-zinc-100 font-semibold hover:bg-zinc-700 transition"
              >
                <Square className="h-4 w-4" />
                Loka og vista
              </button>
            </div>

            {/* Hint */}
            <div className="flex gap-4 text-xs text-zinc-600 flex-wrap">
              <span><span className="text-zinc-500">"Hvað segir þú um X, Handriti?"</span> — spyrja</span>
              <span><span className="text-zinc-500">"Takk Handriti"</span> — halda áfram</span>
            </div>

            {/* Conversation transcript */}
            <div className="space-y-3 min-h-32">
              {messages.length === 0 ? (
                <p className="text-sm text-zinc-600">Uppskrift birtist hér...</p>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={m.type === 'handriti'
                    ? 'rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3'
                    : ''
                  }>
                    {m.type === 'handriti' && (
                      <div className="text-xs text-indigo-400 font-medium mb-1">Handriti</div>
                    )}
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{m.text}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {staða === 'vistar' && (
          <div className="flex items-center gap-3 text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            Vistar og skapar samantekt...
          </div>
        )}
      </div>
    </div>
  )
}
