'use client'

import { useState, useRef, useEffect } from 'react'
import { Zap, Square, Loader2, AlertCircle, ArrowRight } from 'lucide-react'
import { Link } from '@/i18n/navigation'
import { useTranslations, useLocale } from 'next-intl'
import EphemeralResults from '../../components/EphemeralResults'

type Staða = 'biðröð' | 'tengist' | 'í-gangi' | 'vistar' | 'lokið' | 'villa'
type Message = { type: 'user' | 'handriti'; text: string }

export default function BeinlinaClient() {
  const locale = useLocale()
  const t = useTranslations('live')
  const tc = useTranslations('common')
  const tr = useTranslations('record')
  const [staða, setStaða] = useState<Staða>('biðröð')
  const [villa, setVilla] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [summary, setSummary] = useState('')
  const [tímabundið, setTímabundið] = useState(false)
  const [ephResult, setEphResult] = useState<{ transcript: string; yfirferd: string; samantekt: string } | null>(null)

  const pcRef = useRef<RTCPeerConnection | null>(null)
  const dcRef = useRef<RTCDataChannel | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const startTimeRef = useRef<number>(0)

  async function byrja() {
    setVilla('')
    setMessages([])
    setSummary('')
    setSessionId(null)
    setStaða('tengist')

    try {
      const tokenRes = await fetch('/api/beinlina', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ locale }),
      })
      if (!tokenRes.ok) throw new Error(t('tokenError'))
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
          if (event.type === 'conversation.item.input_audio_transcription.completed' && event.transcript?.trim()) {
            setMessages(prev => [...prev, { type: 'user', text: event.transcript.trim() }])
          }
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

      if (!sdpRes.ok) throw new Error(t('connectionError'))

      const answerSdp = await sdpRes.text()
      await pc.setRemoteDescription({ type: 'answer', sdp: answerSdp })

      startTimeRef.current = Date.now()
      setStaða('í-gangi')
    } catch (err) {
      setVilla(err instanceof Error ? err.message : t('unknownError'))
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
    const userLines = messages.filter(m => m.type === 'user')
    if (userLines.length === 0) {
      setStaða('biðröð')
      return
    }
    setStaða('vistar')

    const fullTranscript = messages
      .map(m => m.type === 'handriti' ? `[Handriti]: ${m.text}` : m.text)
      .join('\n\n')

    const elapsed = startTimeRef.current > 0 ? Math.round((Date.now() - startTimeRef.current) / 1000) : 0

    const res = await fetch('/api/beinlina-vista', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: fullTranscript, profile: 'fundur', durationSeconds: elapsed, ephemeral: tímabundið, locale }),
    })
    const data = await res.json()
    if (res.ok) {
      if (data.ephemeral) {
        setEphResult({ transcript: data.transcript, yfirferd: data.yfirferd, samantekt: data.samantekt })
      } else {
        setSessionId(data.sessionId)
        setSummary(data.finalSummary || '')
      }
      setStaða('lokið')
    } else {
      setVilla(data.villa || tc('error'))
      setStaða('villa')
    }
  }

  useEffect(() => () => loka(), [])

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-zinc-100 mb-8">{t('title')}</h1>

        {(staða === 'biðröð' || staða === 'villa') && (
          <div className="space-y-6">
            <p className="text-zinc-500 text-sm" dangerouslySetInnerHTML={{ __html: t('instruction') }} />

            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="text-indigo-400 font-mono text-sm shrink-0 mt-0.5">→</span>
                <div>
                  <p className="text-sm font-medium text-zinc-200">{t('exampleAsk')}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{t('exampleAskDesc')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="text-indigo-400 font-mono text-sm shrink-0 mt-0.5">→</span>
                <div>
                  <p className="text-sm font-medium text-zinc-200">{t('exampleStop')}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{t('exampleStopDesc')}</p>
                </div>
              </div>
            </div>

            {villa && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {villa}
              </div>
            )}

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={tímabundið}
                onChange={e => setTímabundið(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="text-sm text-zinc-400">{tr('ephemeral')}</span>
            </label>
            {tímabundið && (
              <p className="text-xs text-amber-400/70 ml-7">{tr('ephemeralNote')}</p>
            )}

            <button
              onClick={byrja}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-white font-semibold hover:bg-indigo-700 transition"
            >
              <Zap className="h-5 w-5" />
              {t('start')}
            </button>
          </div>
        )}

        {staða === 'tengist' && (
          <div className="flex items-center gap-3 text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t('connecting')}
          </div>
        )}

        {staða === 'í-gangi' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="relative h-5 w-5 flex items-center justify-center">
                  <span className="absolute h-3 w-3 rounded-full bg-indigo-400" />
                  {[0, 1, 2].map(i => (
                    <span
                      key={i}
                      className="absolute h-3 w-3 rounded-full border border-indigo-400"
                      style={{
                        animation: 'sonar 2.4s ease-out infinite',
                        animationDelay: `${i * 0.8}s`,
                      }}
                    />
                  ))}
                </div>
                <span className="font-semibold text-zinc-100">{t('connected')}</span>
              </div>
              <button
                onClick={stöðva}
                className="flex items-center gap-2 rounded-xl bg-zinc-800 px-5 py-2.5 text-zinc-100 font-semibold hover:bg-zinc-700 transition"
              >
                <Square className="h-4 w-4" />
                {t('closeAndSave')}
              </button>
            </div>

            <div className="flex gap-4 text-xs text-zinc-600 flex-wrap">
              <span>{t('hintAsk')}</span>
              <span>{t('hintStop')}</span>
            </div>

            <div className="space-y-3 min-h-32">
              {messages.length === 0 ? (
                <p className="text-sm text-zinc-600">{t('transcriptEmpty')}</p>
              ) : (
                messages.map((m, i) => (
                  <div key={i} className={m.type === 'handriti'
                    ? 'rounded-xl border border-indigo-500/20 bg-indigo-500/5 px-4 py-3'
                    : ''
                  }>
                    {m.type === 'handriti' && (
                      <div className="text-xs text-indigo-400 font-medium mb-1">{t('speakerHandriti')}</div>
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
            {t('saving')}
          </div>
        )}

        {staða === 'lokið' && ephResult && (
          <EphemeralResults transcript={ephResult.transcript} yfirferd={ephResult.yfirferd} samantekt={ephResult.samantekt} />
        )}

        {staða === 'lokið' && !ephResult && (
          <div className="space-y-6">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600 mb-3">{t('summary')}</div>
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">
                  {summary || t('noSummary')}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href={`/sessions/${sessionId}`}
                className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition"
              >
                {t('viewResults')}
                <ArrowRight className="h-4 w-4" />
              </Link>
              <button
                onClick={() => setStaða('biðröð')}
                className="text-sm text-zinc-500 hover:text-zinc-300 transition"
              >
                {t('newSession')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
