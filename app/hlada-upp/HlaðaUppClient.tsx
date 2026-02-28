'use client'

import { useState, useRef } from 'react'
import { Upload, Loader2, AlertCircle, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

type Profile = 'fundur' | 'fyrirlestur' | 'viðtal' | 'frjálst'
type Staða = 'biðröð' | 'hleður' | 'lokið' | 'villa'

const profileNöfn: Record<Profile, string> = {
  fundur: 'Fundur',
  fyrirlestur: 'Fyrirlestur',
  viðtal: 'Viðtal',
  frjálst: 'Frjálst',
}

const LEYFÐAR_ENDINGAR = ['.mp3', '.mp4', '.m4a', '.wav', '.webm', '.ogg', '.flac']
const MAX_MB = 200
const CHUNK_BYTES = 5 * 1024 * 1024 // 5MB per chunk — well within server limits

export default function HlaðaUppClient() {
  const router = useRouter()
  const [staða, setStaða] = useState<Staða>('biðröð')
  const [profile, setProfile] = useState<Profile>('fundur')
  const [nafn, setNafn] = useState('')
  const [villa, setVilla] = useState('')
  const [skrá, setSkrá] = useState<File | null>(null)
  const [framvinda, setFramvinda] = useState('')
  const [hlutarFarið, setHlutarFarið] = useState(0)
  const [hlutarAllt, setHlutarAllt] = useState(0)
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
      setVilla(`Skráin er of stór. Hámark er ${MAX_MB}MB.`)
      return
    }
    setVilla('')
    setSkrá(f)
    if (!nafn) setNafn(f.name.replace(/\.[^/.]+$/, ''))
  }

  async function senda() {
    if (!skrá) return
    setStaða('hleður')
    setVilla('')

    // 1. Reikna fjölda hluta
    const fjöldi = Math.ceil(skrá.size / CHUNK_BYTES)
    setHlutarAllt(fjöldi)
    setHlutarFarið(0)
    setFramvinda(`Undirbý...`)

    try {
      // 2. Búa til lotu
      const lotaRes = await fetch('/api/lotur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nafn: nafn || skrá.name.replace(/\.[^/.]+$/, ''),
          profile,
        }),
      })
      const { session } = await lotaRes.json()

      // 3. Senda hvern hluta
      for (let i = 0; i < fjöldi; i++) {
        setFramvinda(`Hljóðritar hluta ${i + 1} af ${fjöldi}...`)
        const start = i * CHUNK_BYTES
        const end = Math.min(start + CHUNK_BYTES, skrá.size)
        const blob = skrá.slice(start, end, skrá.type || 'audio/webm')

        const fd = new FormData()
        fd.append('hljod', blob, `hluti-${i}${getExtension(skrá.name)}`)
        fd.append('sessionId', session.id)
        fd.append('seq', String(i))
        fd.append('seconds', String(Math.round((end - start) / skrá.size * estimateDuration(skrá))))

        const res = await fetch('/api/hljod-hluti', { method: 'POST', body: fd })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.villa || `Hluti ${i + 1} mistókst`)
        }

        setHlutarFarið(i + 1)
      }

      // 4. Ljúka lotu og búa til lokasamantekt
      setFramvinda('Skapar lokasamantekt...')
      await fetch('/api/lotur', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId: session.id, aðgerð: 'ljúka' }),
      })

      setStaða('lokið')
      setTimeout(() => router.push(`/lotur/${session.id}`), 1000)
    } catch (err) {
      setVilla(err instanceof Error ? err.message : 'Tenging mistókst. Reyndu aftur.')
      setStaða('villa')
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Hlaða upp skrá</h1>

        {staða === 'biðröð' || staða === 'villa' ? (
          <div className="space-y-6">
            <div
              onClick={() => fileRef.current?.click()}
              className={`cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition ${
                skrá ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <input
                ref={fileRef}
                type="file"
                accept={LEYFÐAR_ENDINGAR.join(',')}
                onChange={velja}
                className="hidden"
              />
              <Upload className={`h-8 w-8 mx-auto mb-3 ${skrá ? 'text-green-500' : 'text-gray-300'}`} />
              {skrá ? (
                <div>
                  <p className="font-medium text-gray-900">{skrá.name}</p>
                  <p className="text-sm text-gray-400 mt-1">{(skrá.size / 1024 / 1024).toFixed(1)} MB</p>
                </div>
              ) : (
                <div>
                  <p className="text-gray-500">Smelltu til að velja skrá</p>
                  <p className="text-sm text-gray-400 mt-1">{LEYFÐAR_ENDINGAR.join(' · ')} · hámark {MAX_MB}MB</p>
                </div>
              )}
            </div>

            {villa && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-red-700 text-sm">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {villa}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tegund</label>
              <div className="flex gap-2 flex-wrap">
                {(Object.keys(profileNöfn) as Profile[]).map(p => (
                  <button
                    key={p}
                    onClick={() => setProfile(p)}
                    className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                      profile === p
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200 text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {profileNöfn[p]}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nafn (valfrjálst)</label>
              <input
                type="text"
                value={nafn}
                onChange={e => setNafn(e.target.value)}
                placeholder="Nafn á lotu"
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              onClick={senda}
              disabled={!skrá}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-white font-semibold hover:bg-blue-700 transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Upload className="h-5 w-5" />
              Senda til vinnslu
            </button>
          </div>
        ) : staða === 'hleður' ? (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            <p className="font-medium text-gray-900">{framvinda}</p>
            {hlutarAllt > 1 && (
              <div className="w-full max-w-xs">
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${(hlutarFarið / hlutarAllt) * 100}%` }}
                  />
                </div>
                <p className="text-sm text-gray-400 mt-2">{hlutarFarið} / {hlutarAllt} hlutar</p>
              </div>
            )}
            <p className="text-sm text-gray-400">Loka ekki þessum glugga</p>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <p className="font-medium text-gray-900">Vinnslu lokið!</p>
            <p className="text-sm text-gray-400">Fer yfir á niðurstöður...</p>
          </div>
        )}
      </div>
    </div>
  )
}

function getExtension(filename: string): string {
  const ext = filename.split('.').pop()
  return ext ? `.${ext}` : '.webm'
}

function estimateDuration(file: File): number {
  // Rough estimate: ~1MB per minute for compressed audio
  return Math.round(file.size / (1024 * 1024))
}
