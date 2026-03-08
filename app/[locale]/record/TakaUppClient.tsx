'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { formatDate } from '@/i18n/config'
import EphemeralResults from '../../components/EphemeralResults'
import AudioVisualizer from '../../components/motion/AudioVisualizer'

type Profile = 'fundur' | 'fyrirlestur' | 'viðtal' | 'frjálst' | 'stjórnarfundur'
type Staða = 'biðröð' | 'taka-upp' | 'hleður' | 'lokið' | 'villa'

const HLUTI_TIMI_MS = 20_000 // 20 sek per hluta
const CHUNK_TYPE = 'audio/webm;codecs=opus'

const PROFILES: Profile[] = ['fundur', 'fyrirlestur', 'viðtal', 'frjálst', 'stjórnarfundur']

const profileTranslationKey: Record<string, string> = {
  'fundur': 'fundur',
  'fyrirlestur': 'fyrirlestur',
  'viðtal': 'vidtal',
  'frjálst': 'frjalst',
  'stjórnarfundur': 'stjornarfundur',
}

export default function TakaUppClient() {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('record')
  const tc = useTranslations('common')
  const tp = useTranslations('profiles')
  const [staða, setStaða] = useState<Staða>('biðröð')
  const [profile, setProfile] = useState<Profile>('fundur')
  const [nafn, setNafn] = useState('')
  const [glósur, setGlósur] = useState<string[]>([])
  const [samantekt, setSamantekt] = useState('')
  const [villa, setVilla] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [tímabundið, setTímabundið] = useState(false)
  const [ephResult, setEphResult] = useState<{ transcript: string; yfirferd: string; samantekt: string } | null>(null)

  const [activeStream, setActiveStream] = useState<MediaStream | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const seqRef = useRef(0)
  const eventSourceRef = useRef<EventSource | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const ephTranscriptsRef = useRef<string[]>([])
  const ephNotesRef = useRef<string[]>([])
  const sessionIdRef = useRef<string | null>(null)

  function profileLabel(p: Profile) {
    return tp(profileTranslationKey[p] || p)
  }

  async function byrjaUpptöku() {
    setVilla('')
    setGlósur([])
    setSamantekt('')
    setEphResult(null)
    seqRef.current = 0
    ephTranscriptsRef.current = []
    ephNotesRef.current = []

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    setActiveStream(stream)

    let sid: string | null = null
    if (!tímabundið) {
      const res = await fetch('/api/lotur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nafn: nafn || `${profileLabel(profile)} ${formatDate(new Date())}`, profile, locale }),
      })
      const { session } = await res.json()
      sid = session.id
      setSessionId(sid)
      sessionIdRef.current = sid

      // Start SSE stream
      const es = new EventSource(`/api/straumur?sessionId=${session.id}`)
      es.onmessage = (e) => {
        const data = JSON.parse(e.data)
        if (data.tegund === 'glosa') setGlósur(prev => [...prev, data.efni])
        if (data.tegund === 'samantekt') setSamantekt(data.efni)
      }
      eventSourceRef.current = es
    }

    const mimeType = MediaRecorder.isTypeSupported(CHUNK_TYPE) ? CHUNK_TYPE : 'audio/webm'
    const recorder = new MediaRecorder(stream, { mimeType })
    recorderRef.current = recorder
    chunksRef.current = []

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data)
    }

    recorder.onstop = async () => {
      if (chunksRef.current.length === 0) return
      const blob = new Blob(chunksRef.current, { type: mimeType })
      chunksRef.current = []
      await sendHluti(blob, sid, seqRef.current++)
    }

    recorder.start()
    setStaða('taka-upp')

    // Send chunk every HLUTI_TIMI_MS
    const interval = setInterval(() => {
      if (recorder.state === 'recording') {
        recorder.stop()
        setTimeout(() => {
          if (recorderRef.current?.state === 'inactive') {
            recorder.start()
          }
        }, 100)
      }
    }, HLUTI_TIMI_MS)

    ;(recorder as any)._interval = interval
  }

  async function sendHluti(blob: Blob, sid: string | null, seq: number) {
    const fd = new FormData()
    fd.append('hljod', blob, 'hluti.webm')
    if (sid) fd.append('sessionId', sid)
    fd.append('seq', String(seq))
    fd.append('seconds', String(HLUTI_TIMI_MS / 1000))

    fd.append('locale', locale)
    if (tímabundið) {
      fd.append('ephemeral', 'true')
      fd.append('profile', profile)
      fd.append('previousTranscripts', JSON.stringify(ephTranscriptsRef.current))
    }

    try {
      const res = await fetch('/api/hljod-hluti', { method: 'POST', body: fd })
      if (tímabundið && res.ok) {
        const data = await res.json()
        if (data.transcript) {
          ephTranscriptsRef.current.push(data.transcript)
          ephNotesRef.current.push(data.notes || '')
          setGlósur(prev => [...prev, data.notes || data.transcript])
        }
      }
    } catch {
      setVilla(t('sendError'))
    }
  }

  async function stöðvaUpptöku() {
    setStaða('hleður')
    setActiveStream(null)
    const recorder = recorderRef.current
    if (recorder) {
      clearInterval((recorder as any)._interval)
      recorder.stop()
      recorder.stream.getTracks().forEach(t => t.stop())
    }
    eventSourceRef.current?.close()

    // Wait for last chunk to finish sending
    await new Promise(r => setTimeout(r, 2000))

    const sid = sessionIdRef.current

    if (tímabundið) {
      const combinedTranscript = ephTranscriptsRef.current.join('\n\n')
      if (!combinedTranscript) {
        setStaða('biðröð')
        return
      }
      try {
        const res = await fetch('/api/beinlina-vista', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transcript: combinedTranscript,
            profile,
            nafn: nafn || `${profileLabel(profile)} ${formatDate(new Date())}`,
            durationSeconds: ephTranscriptsRef.current.length * (HLUTI_TIMI_MS / 1000),
            ephemeral: true,
            locale,
          }),
        })
        const data = await res.json()
        if (res.ok && data.ephemeral) {
          setEphResult({ transcript: data.transcript, yfirferd: data.yfirferd, samantekt: data.samantekt })
          setStaða('lokið')
        } else {
          setVilla(data.villa || tc('error'))
          setStaða('villa')
        }
      } catch {
        setVilla(tc('connectionFailed'))
        setStaða('villa')
      }
    } else if (sid) {
      await fetch('/api/lotur', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: sid, aðgerð: 'ljúka' }),
      })
      router.push(`/sessions/${sid}`)
    }
  }

  useEffect(() => {
    return () => {
      recorderRef.current?.stream?.getTracks().forEach(t => t.stop())
      eventSourceRef.current?.close()
    }
  }, [])

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-zinc-100 mb-8">{t('title')}</h1>

        {staða === 'biðröð' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('type')}</label>
              <div className="flex gap-2 flex-wrap">
                {PROFILES.map(p => (
                  <button
                    key={p}
                    onClick={() => setProfile(p)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                      profile === p
                        ? 'bg-indigo-500 text-white'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    {profileLabel(p)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">{t('nameLabel')}</label>
              <input
                type="text"
                value={nafn}
                onChange={e => setNafn(e.target.value)}
                placeholder={`${profileLabel(profile)} ${formatDate(new Date())}`}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={tímabundið}
                onChange={e => setTímabundið(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-400"
              />
              <span className="text-sm text-zinc-400">{t('ephemeral')}</span>
            </label>
            {tímabundið && (
              <p className="text-xs text-amber-400/70 ml-7">{t('ephemeralNote')}</p>
            )}

            <button
              onClick={byrjaUpptöku}
              className="flex items-center gap-2 rounded-xl bg-indigo-500 px-6 py-3 text-white font-semibold hover:bg-indigo-600 transition"
            >
              <Mic className="h-5 w-5" />
              {t('start')}
            </button>
          </div>
        )}

        {staða === 'taka-upp' && (
          <div className="space-y-6">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="h-2.5 w-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="font-semibold text-zinc-100">{t('recording')}</span>
                </div>
                <button
                  onClick={stöðvaUpptöku}
                  className="flex items-center gap-2 rounded-xl bg-zinc-800 px-5 py-2.5 text-zinc-100 font-semibold hover:bg-zinc-700 transition-colors"
                >
                  <Square className="h-4 w-4" />
                  {t('stop')}
                </button>
              </div>
              <AudioVisualizer stream={activeStream} barCount={40} />
            </div>

            {villa && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {villa}
              </div>
            )}

            {samantekt && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600 mb-2">{t('overview')}</div>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{samantekt}</p>
              </div>
            )}

            {glósur.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600">{t('notes')}</div>
                {glósur.map((g, i) => (
                  <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                    <p className="text-sm text-zinc-300 whitespace-pre-wrap">{g}</p>
                  </div>
                ))}
              </div>
            )}

            {glósur.length === 0 && (
              <div className="flex items-center gap-2 text-zinc-500 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('listening')}
              </div>
            )}
          </div>
        )}

        {staða === 'hleður' && (
          <div className="flex items-center gap-3 text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>{tímabundið ? t('summarizing') : t('finishing')}</span>
          </div>
        )}

        {staða === 'lokið' && ephResult && (
          <EphemeralResults transcript={ephResult.transcript} yfirferd={ephResult.yfirferd} samantekt={ephResult.samantekt} />
        )}
      </div>
    </div>
  )
}
