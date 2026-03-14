'use client'

import { useState, useRef } from 'react'
import { put } from '@vercel/blob/client'
import { Upload, Loader2, AlertCircle, CheckCircle, ChevronDown, ChevronRight } from 'lucide-react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations, useLocale } from 'next-intl'
import EphemeralResults from '../../components/EphemeralResults'

type Profile = 'fundur' | 'fyrirlestur' | 'viðtal' | 'frjálst' | 'stjórnarfundur'
type Staða = 'biðröð' | 'klippir' | 'hleður' | 'vinnur' | 'lokið' | 'villa'

const PROFILES: Profile[] = ['fundur', 'fyrirlestur', 'viðtal', 'frjálst', 'stjórnarfundur']

const profileTranslationKey: Record<string, string> = {
  'fundur': 'fundur',
  'fyrirlestur': 'fyrirlestur',
  'viðtal': 'vidtal',
  'frjálst': 'frjalst',
  'stjórnarfundur': 'stjornarfundur',
}

const LEYFÐAR_ENDINGAR = ['.mp3', '.mp4', '.m4a', '.wav', '.webm', '.ogg', '.flac']
const MAX_MB = 100

export default function UploadClient() {
  const router = useRouter()
  const locale = useLocale()
  const t = useTranslations('upload')
  const tc = useTranslations('common')
  const tp = useTranslations('profiles')
  const tr = useTranslations('record')
  const [staða, setStaða] = useState<Staða>('biðröð')
  const [profile, setProfile] = useState<Profile>('fundur')
  const [nafn, setNafn] = useState('')
  const [villa, setVilla] = useState('')
  const [skrá, setSkrá] = useState<File | null>(null)
  const [framvinda, setFramvinda] = useState(0)
  const [skref, setSkref] = useState('')
  const [tímabundið, setTímabundið] = useState(false)
  const [sýnaSamhengi, setSýnaSamhengi] = useState(false)
  const [samhengi, setSamhengi] = useState('')
  const [ephResult, setEphResult] = useState<{ transcript: string; yfirferd: string; samantekt: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function profileLabel(p: Profile) {
    return tp(profileTranslationKey[p] || p)
  }

  const stepLabels: Record<string, string> = {
    fetching: t('steps.fetching'),
    transcribing: t('steps.transcribing'),
    generating_notes: t('steps.generating_notes'),
    summarizing: t('steps.summarizing'),
    sending_email: t('steps.sending_email'),
    done: t('steps.done'),
  }

  function translateStep(step: string): string {
    return stepLabels[step] || step
  }

  function velja(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const ext = '.' + f.name.split('.').pop()?.toLowerCase()
    if (!LEYFÐAR_ENDINGAR.includes(ext)) {
      setVilla(t('unsupportedFormat', { formats: LEYFÐAR_ENDINGAR.join(', ') }))
      return
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setVilla(t('fileTooLarge', { size: (f.size / 1024 / 1024).toFixed(0), maxMb: MAX_MB }))
      return
    }
    setVilla('')
    setSkrá(f)
    if (!nafn) setNafn(f.name.replace(/\.[^/.]+$/, ''))
  }

  async function senda() {
    if (!skrá) return
    setVilla('')

    try {
      // ── 1. Klippa skrá ──────────────────────────────
      setStaða('klippir')
      setSkref(t('loadingClipper'))
      setFramvinda(5)

      const { loadFFmpeg, splitAudio } = await import('@/lib/ffmpeg/split')
      await loadFFmpeg((pct) => setFramvinda(Math.min(5 + Math.round(pct * 0.3), 35)))

      setSkref(t('clipping'))
      const hlutar = await splitAudio(skrá, (msg) => setSkref(msg))
      setFramvinda(40)
      setSkref(t('chunksReady', { count: hlutar.length }))

      // ── 2. Búa til lotu ─────────────────────────────
      const startRes = await fetch('/api/hljod-stort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start',
          profile,
          nafn: nafn || skrá.name.replace(/\.[^/.]+$/, ''),
          ephemeral: tímabundið,
          locale,
        }),
      })
      const startData = await startRes.json()
      if (!startRes.ok) throw new Error(startData.villa || tc('error'))
      const sessionId = startData.sessionId as string | undefined
      const collectedTranscripts: string[] = []
      const collectedDurations: number[] = []

      // ── 3. Hlaða upp og þýða hvern hluta ────────────
      const ext = '.' + (skrá.name.split('.').pop()?.toLowerCase() || 'webm')

      for (let i = 0; i < hlutar.length; i++) {
        const hluti = hlutar[i]
        const chunkName = `chunk_${i}${ext}`

        // 3a. Upload
        setStaða('hleður')
        setSkref(t('uploadingChunk', { i: i + 1, total: hlutar.length }))
        setFramvinda(0)

        const blobPath = `uploads/${Date.now()}-${sessionId}-${chunkName}`
        const tokenRes = await fetch('/api/blob-upload', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pathname: blobPath }),
        })
        const { clientToken, error: tokenError } = await tokenRes.json()
        if (!tokenRes.ok || !clientToken) throw new Error(tokenError || t('prepError'))

        const blob = await put(blobPath, hluti, {
          access: 'private',
          token: clientToken,
          multipart: false,
          onUploadProgress: (e) => {
            setFramvinda(Math.min(Math.round(e.percentage), 99))
          },
        })

        // 3b. Transcribe
        setStaða('vinnur')
        setSkref(t('transcribingChunk', { i: i + 1, total: hlutar.length }))
        setFramvinda(Math.round(((i + 0.5) / hlutar.length) * 100))

        const trRes = await fetch('/api/hljod-stort', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'transcribe',
            sessionId,
            blobUrl: blob.url,
            seq: i,
            filename: chunkName,
            ephemeral: tímabundið,
            locale,
          }),
        })
        const trData = await trRes.json()
        if (!trRes.ok) throw new Error(trData.villa || t('chunkError', { i: i + 1 }))
        if (trData.transcript) {
          collectedTranscripts.push(trData.transcript)
          collectedDurations.push(trData.durationSeconds || 0)
        }
      }

      // ── 4. Samantekt ────────────────────────────────
      setStaða('vinnur')
      setSkref(t('creatingSummary'))
      setFramvinda(0)

      const sumRes = await fetch('/api/hljod-stort', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'summarize',
          sessionId,
          filename: skrá.name,
          fileSize: String(skrá.size),
          ephemeral: tímabundið,
          profile,
          nafn: nafn || skrá.name.replace(/\.[^/.]+$/, ''),
          locale,
          ...(samhengi && { userContext: samhengi }),
          ...(tímabundið && { transcripts: collectedTranscripts, durations: collectedDurations }),
        }),
      })

      if (!sumRes.ok) {
        const errData = await sumRes.json().catch(() => ({}))
        throw new Error(errData.villa || t('errorStatus', { status: sumRes.status }))
      }

      // Read SSE stream
      const reader = sumRes.body?.getReader()
      if (!reader) throw new Error(t('streamUnavailable'))

      const decoder = new TextDecoder()
      let buffer = ''
      let finalSessionId = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() || ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.step === 'villa' || data.step === 'error') throw new Error(data.villa)
            if (data.step === 'lokið' || data.step === 'done') {
              finalSessionId = data.sessionId
              if (data.ephemeral) {
                setEphResult({ transcript: data.transcript, yfirferd: data.yfirferd, samantekt: data.samantekt })
              }
            } else {
              setSkref(translateStep(data.step))
              setFramvinda(data.progress)
            }
          } catch (e) {
            if (e instanceof Error && e.message !== line.slice(6)) throw e
          }
        }
      }

      if (!tímabundið && !finalSessionId) throw new Error(t('genericError'))

      setStaða('lokið')
      if (!tímabundið && finalSessionId) {
        setTimeout(() => router.push(`/sessions/${finalSessionId}`), 1000)
      }
    } catch (err) {
      setVilla(err instanceof Error ? err.message : t('connectionFailed'))
      setStaða('villa')
    }
  }

  return (
    <div className="space-y-6">
      {staða === 'biðröð' || staða === 'villa' ? (
        <>
          <div
            onClick={() => fileRef.current?.click()}
            className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
              skrá
                ? 'border-emerald-500/50 bg-emerald-500/5'
                : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700'
            }`}
          >
            <input
              ref={fileRef}
              type="file"
              accept={LEYFÐAR_ENDINGAR.join(',')}
              onChange={velja}
              className="hidden"
            />
            <Upload className={`h-8 w-8 mx-auto mb-3 ${skrá ? 'text-emerald-400' : 'text-zinc-600'}`} />
            {skrá ? (
              <div>
                <p className="font-medium text-zinc-100">{skrá.name}</p>
                <p className="text-sm text-zinc-500 mt-1">{(skrá.size / 1024 / 1024).toFixed(1)} MB</p>
              </div>
            ) : (
              <div>
                <p className="text-zinc-400">{t('selectFile')}</p>
                <p className="text-sm text-zinc-600 mt-1">{t('sizeInfo', { formats: LEYFÐAR_ENDINGAR.join(' · '), maxMb: MAX_MB })}</p>
              </div>
            )}
          </div>

          {villa && (
            <div className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-3 text-red-400 text-sm">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{villa}</span>
            </div>
          )}

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

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={tímabundið}
              onChange={e => setTímabundið(e.target.checked)}
              className="h-4 w-4 rounded border-zinc-700 bg-zinc-900 text-indigo-500 focus:ring-indigo-400"
            />
            <span className="text-sm text-zinc-400">{tr('ephemeral')}</span>
          </label>
          {tímabundið && (
            <p className="text-xs text-amber-400/70 ml-7">{tr('ephemeralNote')}</p>
          )}

          <div>
            <label className="block text-sm font-medium text-zinc-400 mb-2">{t('nameLabel')}</label>
            <input
              type="text"
              value={nafn}
              onChange={e => setNafn(e.target.value)}
              placeholder={t('namePlaceholder')}
              className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => setSýnaSamhengi(!sýnaSamhengi)}
              className="flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition"
            >
              {sýnaSamhengi ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
              {tr('contextToggle')}
            </button>
            {sýnaSamhengi && (
              <div className="mt-2 space-y-1.5">
                <textarea
                  value={samhengi}
                  onChange={e => setSamhengi(e.target.value)}
                  placeholder={tr(`contextPlaceholder_${profile}`)}
                  rows={5}
                  maxLength={2000}
                  className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
                />
                <p className="text-xs text-zinc-600">{tr('contextHint')}</p>
              </div>
            )}
          </div>

          <button
            onClick={senda}
            disabled={!skrá}
            className="flex items-center gap-2 rounded-xl bg-indigo-500 px-6 py-3 text-white font-semibold hover:bg-indigo-600 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Upload className="h-5 w-5" />
            {t('submit')}
          </button>
        </>
      ) : staða === 'klippir' || staða === 'hleður' || staða === 'vinnur' ? (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-indigo-400" />
          <div className="w-full max-w-xs">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-zinc-400">{skref || tc('processing')}</span>
              <span className="text-indigo-400 font-medium">{framvinda}%</span>
            </div>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-indigo-500 transition-all duration-500"
                style={{ width: `${framvinda}%` }}
              />
            </div>
          </div>
          <p className="text-sm text-zinc-500 mt-2">{tc('doNotClose')}</p>
        </div>
      ) : ephResult ? (
        <EphemeralResults transcript={ephResult.transcript} yfirferd={ephResult.yfirferd} samantekt={ephResult.samantekt} />
      ) : (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <CheckCircle className="h-8 w-8 text-emerald-400" />
          <p className="font-medium text-zinc-100">{tc('done')}</p>
          <p className="text-sm text-zinc-500">{tc('fetchingResults')}</p>
        </div>
      )}
    </div>
  )
}
