'use client'

import { useState, useRef } from 'react'
import { upload } from '@vercel/blob/client'
import { Upload, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Profile = 'fundur' | 'fyrirlestur' | 'viðtal' | 'frjálst'
type Staða = 'biðröð' | 'hleður' | 'vinnur' | 'lokið' | 'villa'

const profileNöfn: Record<Profile, string> = {
  fundur: 'Fundur',
  fyrirlestur: 'Fyrirlestur',
  viðtal: 'Viðtal',
  frjálst: 'Frjálst',
}

const LEYFÐAR_ENDINGAR = ['.mp3', '.mp4', '.m4a', '.wav', '.webm', '.ogg', '.flac']
const MAX_MB = 24

export default function HlaðaUppClient() {
  const router = useRouter()
  const [staða, setStaða] = useState<Staða>('biðröð')
  const [profile, setProfile] = useState<Profile>('fundur')
  const [nafn, setNafn] = useState('')
  const [villa, setVilla] = useState('')
  const [skrá, setSkrá] = useState<File | null>(null)
  const [lengd, setLengd] = useState(0)
  const [framvinda, setFramvinda] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)

  function velja(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    const ext = '.' + f.name.split('.').pop()?.toLowerCase()
    if (!LEYFÐAR_ENDINGAR.includes(ext)) {
      setVilla(`Ólögleg skráarending. Leyfðar: ${LEYFÐAR_ENDINGAR.join(', ')}`)
      return
    }
    if (f.size > MAX_MB * 1024 * 1024) {
      setVilla(
        `Skráin er of stór (${(f.size / 1024 / 1024).toFixed(0)}MB). ` +
        `Hámark er ${MAX_MB}MB vegna takmarkana OpenAI. ` +
        `Þjappaðu skránni eða notaðu "Taka upp" í beinni fyrir lengri fundi.`
      )
      return
    }
    setVilla('')
    setSkrá(f)
    setLengd(0)
    if (!nafn) setNafn(f.name.replace(/\.[^/.]+$/, ''))

    // Reyna að greina lengd hljóðskrár
    try {
      const url = URL.createObjectURL(f)
      const audio = new Audio(url)
      audio.addEventListener('loadedmetadata', () => {
        if (audio.duration && isFinite(audio.duration)) {
          setLengd(Math.round(audio.duration))
        }
        URL.revokeObjectURL(url)
      })
      audio.addEventListener('error', () => URL.revokeObjectURL(url))
    } catch {
      // Ef ekki tekst — fallback á 0, server áætlar úr orðafjölda
    }
  }

  async function senda() {
    if (!skrá) return
    setStaða('hleður')
    setFramvinda(0)
    setVilla('')

    try {
      // 1. Upload to Vercel Blob (bypasses 4.5MB serverless limit)
      const blob = await upload(skrá.name, skrá, {
        access: 'public',
        handleUploadUrl: '/api/blob-upload',
        onUploadProgress: (e) => {
          setFramvinda(e.percentage)
        },
      })

      // 2. Send blob URL + metadata to API for processing
      setFramvinda(100)
      setStaða('vinnur')

      const res = await fetch('/api/hljod-skra', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          blobUrl: blob.url,
          filename: skrá.name,
          profile,
          nafn: nafn || skrá.name.replace(/\.[^/.]+$/, ''),
          lengd: lengd > 0 ? String(lengd) : '0',
          fileSize: String(skrá.size),
        }),
      })

      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        throw new Error(data.villa || `Villa ${res.status}`)
      }

      setStaða('lokið')
      setTimeout(() => router.push(`/lotur/${data.sessionId}`), 1000)
    } catch (err) {
      setVilla(err instanceof Error ? err.message : 'Tenging mistókst. Reyndu aftur.')
      setStaða('villa')
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-zinc-100 mb-8">Hlaða upp skrá</h1>

        {staða === 'biðröð' || staða === 'villa' ? (
          <div className="space-y-6">
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
                  <p className="text-zinc-400">Smelltu til að velja skrá</p>
                  <p className="text-sm text-zinc-600 mt-1">{LEYFÐAR_ENDINGAR.join(' · ')} · hámark {MAX_MB}MB</p>
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
                placeholder="Nafn á lotu"
                className="w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <button
              onClick={senda}
              disabled={!skrá}
              className="flex items-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Upload className="h-5 w-5" />
              Senda til vinnslu
            </button>
          </div>
        ) : staða === 'hleður' ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <div className="w-full max-w-xs">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-400">Hleður upp...</span>
                <span className="text-indigo-400 font-medium">{framvinda}%</span>
              </div>
              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${framvinda}%` }}
                />
              </div>
            </div>
            <p className="text-sm text-zinc-500 mt-2">Loka ekki þessum glugga</p>
          </div>
        ) : staða === 'vinnur' ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            <p className="font-medium text-zinc-100">Þýðir og tekur saman...</p>
            <p className="text-sm text-zinc-500">Þetta getur tekið nokkrar mínútur — loka ekki þessum glugga</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <CheckCircle className="h-8 w-8 text-emerald-400" />
            <p className="font-medium text-zinc-100">Vinnslu lokið!</p>
            <p className="text-sm text-zinc-500">Fer yfir á niðurstöður...</p>
          </div>
        )}
      </div>
    </div>
  )
}
