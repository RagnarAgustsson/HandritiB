'use client'

import { useState, useRef, useEffect } from 'react'
import { Zap, Square, Loader2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Staða = 'biðröð' | 'tengist' | 'í-gangi' | 'vistar' | 'villa'

export default function BeinlinaClient() {
  const router = useRouter()
  const [staða, setStaða] = useState<Staða>('biðröð')
  const [villa, setVilla] = useState('')
  const [uppskrift, setUppskrift] = useState('')

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  async function byrja() {
    setVilla('')
    setUppskrift('')
    setStaða('tengist')

    try {
      // 1. Get ephemeral token from our server
      const tokenRes = await fetch('/api/beinlina', { method: 'POST' })
      if (!tokenRes.ok) throw new Error('Gat ekki fengið aðgangslykilinn')
      const { client_secret } = await tokenRes.json()

      // 2. Get mic
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream

      // 3. Create WebRTC connection to OpenAI directly
      const pc = new RTCPeerConnection()
      pcRef.current = pc

      // Add audio track
      stream.getAudioTracks().forEach(track => pc.addTrack(track, stream))

      // Receive AI audio response (optional — for future use)
      pc.ontrack = (e) => {
        const audio = new Audio()
        audio.srcObject = e.streams[0]
        audio.play().catch(() => {})
      }

      // Data channel for transcript events
      const dc = pc.createDataChannel('oai-events')
      dcRef.current = dc

      dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data)
          if (event.type === 'conversation.item.input_audio_transcription.completed') {
            setUppskrift(prev => prev + (prev ? ' ' : '') + event.transcript)
          }
        } catch {
          // ignore malformed events
        }
      }

      // Create offer
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)

      // Send to OpenAI Realtime
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
    if (!uppskrift.trim()) {
      setStaða('biðröð')
      return
    }
    setStaða('vistar')
    const res = await fetch('/api/beinlina-vista', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: uppskrift, profile: 'frjálst' }),
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
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Beinlína</h1>

        {(staða === 'biðröð' || staða === 'villa') && (
          <div className="space-y-6">
            <p className="text-gray-500 text-sm">
              Tengist beint við GPT Realtime í gegnum WebRTC. Talaðu — uppskrift birtist á skjánum.
            </p>

            {villa && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {villa}
              </div>
            )}

            <button
              onClick={byrja}
              className="flex items-center gap-2 rounded-xl bg-purple-600 px-6 py-3 text-white font-semibold hover:bg-purple-700 transition"
            >
              <Zap className="h-5 w-5" />
              Byrja beinlínu
            </button>
          </div>
        )}

        {staða === 'tengist' && (
          <div className="flex items-center gap-3 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Tengist...
          </div>
        )}

        {staða === 'í-gangi' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-purple-500 animate-pulse" />
                <span className="font-semibold text-gray-900">Í beinlínu</span>
              </div>
              <button
                onClick={stöðva}
                className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-white font-semibold hover:bg-gray-700 transition"
              >
                <Square className="h-4 w-4" />
                Loka og vista
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 min-h-32">
              {uppskrift ? (
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{uppskrift}</p>
              ) : (
                <p className="text-sm text-gray-400">Uppskrift birtist hér...</p>
              )}
            </div>
          </div>
        )}

        {staða === 'vistar' && (
          <div className="flex items-center gap-3 text-gray-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Vistar og skapar samantekt...
          </div>
        )}
      </div>
    </div>
  )
}
