'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Copy, Check, ArrowLeft, Pencil } from 'lucide-react'
import type { Session, Chunk, Note } from '@/lib/db/schema'

interface Props {
  session: Session
  chunks: Chunk[]
  notes: Note[]
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition">
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}

const profileNöfn: Record<string, string> = {
  fundur: 'Fundur', fyrirlestur: 'Fyrirlestur', viðtal: 'Viðtal', frjálst: 'Frjálst',
}

export default function NiðurstaðaClient({ session, chunks, notes }: Props) {
  const [flipi, setFlipi] = useState<'glósur' | 'uppskrift' | 'samantekt'>('glósur')
  const [nafn, setNafn] = useState(session.name)
  const [endurnefna, setEndurnefna] = useState(false)
  const [nýttNafn, setNýttNafn] = useState(session.name)

  async function vistaEndurnefna() {
    if (!nýttNafn.trim()) return
    await fetch('/api/lotur', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId: session.id, aðgerð: 'endurnefna', nafn: nýttNafn }),
    })
    setNafn(nýttNafn)
    setEndurnefna(false)
  }

  const uppskrift = chunks.map(c => c.transcript).join('\n\n')
  const allGlósur = notes.map(n => n.content).join('\n\n')

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link href="/lotur" className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 mb-6 transition">
          <ArrowLeft className="h-4 w-4" />
          Mínar lotur
        </Link>

        <div className="mb-6">
          {endurnefna ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nýttNafn}
                onChange={e => setNýttNafn(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') vistaEndurnefna(); if (e.key === 'Escape') setEndurnefna(false) }}
                className="text-2xl font-bold text-gray-900 border-b-2 border-blue-500 bg-transparent outline-none flex-1"
              />
              <button onClick={vistaEndurnefna} className="text-sm text-blue-600 hover:underline">Vista</button>
              <button onClick={() => setEndurnefna(false)} className="text-sm text-gray-400 hover:underline">Hætta við</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-2xl font-bold text-gray-900">{nafn}</h1>
              <button
                onClick={() => { setNýttNafn(nafn); setEndurnefna(true) }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-gray-100 text-gray-400 transition"
              >
                <Pencil className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="text-sm text-gray-400 mt-1">
            {profileNöfn[session.profile]} · {new Date(session.createdAt).toLocaleDateString('is-IS')}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-xl p-1">
          {(['glósur', 'uppskrift', 'samantekt'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFlipi(f)}
              className={`flex-1 py-2 text-sm font-medium rounded-lg transition capitalize ${
                flipi === f ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {f === 'glósur' ? 'Glósur' : f === 'uppskrift' ? 'Uppskrift' : 'Samantekt'}
            </button>
          ))}
        </div>

        {/* Glósur */}
        {flipi === 'glósur' && (
          <div className="space-y-3">
            {notes.length === 0 ? (
              <p className="text-gray-400 text-sm">Engar glósur.</p>
            ) : (
              <>
                <div className="flex justify-end">
                  <CopyButton text={allGlósur} />
                </div>
                {notes.map((n, i) => (
                  <div key={n.id} className="rounded-xl border border-gray-200 bg-white p-4">
                    <div className="text-xs text-gray-400 mb-2">Hluti {i + 1}</div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{n.content}</p>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* Uppskrift */}
        {flipi === 'uppskrift' && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            {chunks.length === 0 ? (
              <p className="text-gray-400 text-sm">Engin uppskrift.</p>
            ) : (
              <>
                <div className="flex justify-end mb-2">
                  <CopyButton text={uppskrift} />
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{uppskrift}</p>
              </>
            )}
          </div>
        )}

        {/* Samantekt */}
        {flipi === 'samantekt' && (
          <div className="rounded-xl border border-gray-200 bg-white p-4">
            {session.finalSummary ? (
              <>
                <div className="flex justify-end mb-2">
                  <CopyButton text={session.finalSummary} />
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{session.finalSummary}</p>
              </>
            ) : (
              <p className="text-gray-400 text-sm">Engin samantekt enn. Ljúktu lotunni til að búa til lokasamantekt.</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
