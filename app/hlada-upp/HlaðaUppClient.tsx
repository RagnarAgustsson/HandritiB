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
// Resample to 16kHz mono — what the transcription model uses internally
// 10 min × 16000 Hz × 2 bytes = ~18.3MB per chunk, well within the 25MB API limit
const TARGET_SAMPLE_RATE = 16000
const CHUNK_SECONDS = 600

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
      setVilla(`Skráin er of stór (${(f.size / 1024 / 1024).toFixed(0)}MB). Hámark er ${MAX_MB}MB.`)
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

    try {
      // Small files (≤24MB): send directly — fast path, preserves original quality
      if (skrá.size <= 24 * 1024 * 1024) {
        await sendaHeilSkrá(skrá)
        return
      }

      // Larger files: decode in browser → split into valid WAV chunks → upload each
      setFramvinda('Afkóðar hljóðskrá...')
      const arrayBuffer = await skrá.arrayBuffer()
      const audioCtx = new AudioContext()
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)
      await audioCtx.close()

      const samples = resample(audioBuffer)
      const chunks = splitToChunks(samples)
      setHlutarAllt(chunks.length)
      setHlutarFarið(0)

      // Create session
      const lotaRes = await fetch('/api/lotur', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nafn: nafn || skrá.name.replace(/\.[^/.]+$/, ''), profile }),
      })
      if (!lotaRes.ok) throw new Error('Gat ekki búið til lotu')
      const { session } = await lotaRes.json()

      // Send each WAV chunk — each is a valid, complete audio file
      for (let i = 0; i < chunks.length; i++) {
        setFramvinda(`Hljóðritar hluta ${i + 1} af ${chunks.length}...`)
        const wavBlob = encodeWAV(chunks[i])
        const durationSec = Math.ceil(chunks[i].length / TARGET_SAMPLE_RATE)

        const fd = new FormData()
        fd.append('hljod', wavBlob, `hluti-${i}.wav`)
        fd.append('sessionId', session.id)
        fd.append('seq', String(i))
        fd.append('seconds', String(durationSec))

        const res = await fetch('/api/hljod-hluti', { method: 'POST', body: fd })
        if (!res.ok) {
          const err = await res.json().catch(() => ({}))
          throw new Error(err.villa || `Hluti ${i + 1} mistókst`)
        }
        setHlutarFarið(i + 1)
      }

      // Finalize
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

  async function sendaHeilSkrá(f: File) {
    setFramvinda('Hleður upp og þýðir...')
    const fd = new FormData()
    fd.append('skrá', f, f.name)
    fd.append('profile', profile)
    fd.append('nafn', nafn || f.name.replace(/\.[^/.]+$/, ''))

    const res = await fetch('/api/hljod-skra', { method: 'POST', body: fd })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.villa || `Villa ${res.status}`)

    setStaða('lokið')
    setTimeout(() => router.push(`/lotur/${data.sessionId}`), 1000)
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

// Mix all channels to mono and resample to TARGET_SAMPLE_RATE using linear interpolation
function resample(audioBuffer: AudioBuffer): Float32Array {
  const { numberOfChannels, length, sampleRate } = audioBuffer
  const mono = new Float32Array(length)
  for (let ch = 0; ch < numberOfChannels; ch++) {
    const data = audioBuffer.getChannelData(ch)
    for (let i = 0; i < length; i++) mono[i] += data[i] / numberOfChannels
  }
  if (sampleRate === TARGET_SAMPLE_RATE) return mono

  const ratio = sampleRate / TARGET_SAMPLE_RATE
  const newLength = Math.round(length / ratio)
  const out = new Float32Array(newLength)
  for (let i = 0; i < newLength; i++) {
    const pos = i * ratio
    const idx = Math.floor(pos)
    const frac = pos - idx
    out[i] = (mono[idx] ?? 0) + frac * ((mono[idx + 1] ?? 0) - (mono[idx] ?? 0))
  }
  return out
}

function splitToChunks(samples: Float32Array): Float32Array[] {
  const size = TARGET_SAMPLE_RATE * CHUNK_SECONDS
  const chunks: Float32Array[] = []
  for (let i = 0; i < samples.length; i += size) {
    chunks.push(samples.slice(i, Math.min(i + size, samples.length)))
  }
  return chunks
}

// Encode raw float32 PCM samples as a valid WAV file
function encodeWAV(samples: Float32Array): Blob {
  const buf = new ArrayBuffer(44 + samples.length * 2)
  const v = new DataView(buf)
  const str = (off: number, s: string) => { for (let i = 0; i < s.length; i++) v.setUint8(off + i, s.charCodeAt(i)) }

  str(0, 'RIFF');  v.setUint32(4, 36 + samples.length * 2, true)
  str(8, 'WAVE'); str(12, 'fmt ')
  v.setUint32(16, 16, true)
  v.setUint16(20, 1, true)                         // PCM
  v.setUint16(22, 1, true)                         // mono
  v.setUint32(24, TARGET_SAMPLE_RATE, true)
  v.setUint32(28, TARGET_SAMPLE_RATE * 2, true)
  v.setUint16(32, 2, true); v.setUint16(34, 16, true)
  str(36, 'data'); v.setUint32(40, samples.length * 2, true)

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    v.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
  }
  return new Blob([buf], { type: 'audio/wav' })
}
