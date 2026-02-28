'use client'

import { useState, useRef, useEffect } from 'react'
import { Mic, Square, Loader2, AlertCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Profile = 'fundur' | 'fyrirlestur' | 'viðtal' | 'frjálst'
type Staða = 'biðröð' | 'taka-upp' | 'hleður' | 'villa'

const HLUTI_TIMI_MS = 20_000 // 20 sek per hluta
const CHUNK_TYPE = 'audio/webm;codecs=opus'

const profileNöfn: Record<Profile, string> = {
  fundur: 'Fundur',
  fyrirlestur: 'Fyrirlestur',
  viðtal: 'Viðtal',
  frjálst: 'Frjálst',
}

export default function TakaUppClient() {
  const router = useRouter()
  const [staða, setStaða] = useState<Staða>('biðröð')
  const [profile, setProfile] = useState<Profile>('fundur')
  const [nafn, setNafn] = useState('')
  const [glósur, setGlósur] = useState<string[]>([])
  const [samantekt, setSamantekt] = useState('')
  const [villa, setVilla] = useState('')
  const [sessionId, setSessionId] = useState<string | null>(null)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const seqRef = useRef(0)
  const eventSourceRef = useRef<EventSource | null>(null)
  const chunksRef = useRef<Blob[]>([])

  async function byrjaUpptöku() {
    setVilla('')
    setGlósur([])
    setSamantekt('')
    seqRef.current = 0

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const res = await fetch('/api/lotur', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nafn: nafn || `${profileNöfn[profile]} ${new Date().toLocaleDateString('is-IS')}`, profile }),
    })
    const { session } = await res.json()
    setSessionId(session.id)

    // Start SSE stream
    const es = new EventSource(`/api/straumur?sessionId=${session.id}`)
    es.onmessage = (e) => {
      const data = JSON.parse(e.data)
      if (data.tegund === 'glosa') setGlósur(prev => [...prev, data.efni])
      if (data.tegund === 'samantekt') setSamantekt(data.efni)
    }
    eventSourceRef.current = es

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
      await sendHluti(blob, session.id, seqRef.current++)
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

  async function sendHluti(blob: Blob, sid: string, seq: number) {
    const fd = new FormData()
    fd.append('hljod', blob, 'hluti.webm')
    fd.append('sessionId', sid)
    fd.append('seq', String(seq))
    fd.append('seconds', String(HLUTI_TIMI_MS / 1000))

    try {
      await fetch('/api/hljod-hluti', { method: 'POST', body: fd })
    } catch {
      setVilla('Villa við sendingu hljóðs. Reyni aftur...')
    }
  }

  async function stöðvaUpptöku() {
    setStaða('hleður')
    const recorder = recorderRef.current
    if (recorder) {
      clearInterval((recorder as any)._interval)
      recorder.stop()
      recorder.stream.getTracks().forEach(t => t.stop())
    }
    eventSourceRef.current?.close()

    if (sessionId) {
      await fetch('/api/lotur', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, aðgerð: 'ljúka' }),
      })
      router.push(`/lotur/${sessionId}`)
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
        <h1 className="text-2xl font-bold text-zinc-100 mb-8">Taka upp</h1>

        {staða === 'biðröð' && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Tegund</label>
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(profileNöfn) as Profile[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setProfile(p)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                      profile === p
                        ? 'bg-indigo-600 text-white'
                        : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                    }`}
                  >
                    {profileNöfn[p]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-400 mb-2">Nafn (valfrjálst)</label>
              <input
                type="text"
                value={nafn}
                onChange={e => setNafn(e.target.value)}
                placeholder={`${profileNöfn[profile]} ${new Date().toLocaleDateString('is-IS')}`}
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={byrjaUpptöku}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-white font-semibold hover:bg-indigo-700 transition"
            >
              <Mic className="h-5 w-5" />
              Byrja upptöku
            </button>
          </div>
        )}

        {staða === 'taka-upp' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-red-500 animate-pulse" />
                <span className="font-semibold text-zinc-100">Tekur upp...</span>
              </div>
              <button
                onClick={stöðvaUpptöku}
                className="flex items-center gap-2 rounded-xl bg-zinc-800 px-5 py-2.5 text-zinc-100 font-semibold hover:bg-zinc-700 transition"
              >
                <Square className="h-4 w-4" />
                Stöðva
              </button>
            </div>

            {villa && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {villa}
              </div>
            )}

            {samantekt && (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600 mb-2">Yfirlit</div>
                <p className="text-sm text-zinc-300 whitespace-pre-wrap">{samantekt}</p>
              </div>
            )}

            {glósur.length > 0 && (
              <div className="space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-600">Glósur</div>
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
                Bíð eftir fyrsta hluta...
              </div>
            )}
          </div>
        )}

        {staða === 'hleður' && (
          <div className="flex items-center gap-3 text-zinc-400">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span>Gengur úr skugga um lokasamantekt...</span>
          </div>
        )}
      </div>
    </div>
  )
}
