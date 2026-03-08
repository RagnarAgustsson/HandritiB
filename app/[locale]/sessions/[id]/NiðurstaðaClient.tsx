'use client'

import { useState } from 'react'
import { Link } from '@/i18n/navigation'
import { Copy, Check, ArrowLeft, Pencil, Trash2 } from 'lucide-react'
import { useRouter } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import { motion } from 'motion/react'
import { toast } from 'sonner'
import type { Session, Chunk, Note } from '@/lib/db/schema'

interface Props {
  session: Session
  chunks: Chunk[]
  notes: Note[]
}

function CopyButton({ text }: { text: string }) {
  const t = useTranslations('results')
  const copy = () => {
    navigator.clipboard.writeText(text)
    toast.success(t('copied'))
  }
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors">
      <Copy className="h-4 w-4" />
    </button>
  )
}

const profileTranslationKey: Record<string, string> = {
  'fundur': 'fundur',
  'fyrirlestur': 'fyrirlestur',
  'viðtal': 'vidtal',
  'frjálst': 'frjalst',
  'stjórnarfundur': 'stjornarfundur',
}

const tabs = ['yfirferd', 'uppskrift', 'samantekt'] as const

export default function NiðurstaðaClient({ session, chunks, notes }: Props) {
  const router = useRouter()
  const t = useTranslations('results')
  const ts = useTranslations('sessions')
  const tc = useTranslations('common')
  const tp = useTranslations('profiles')
  const [flipi, setFlipi] = useState<'yfirferd' | 'uppskrift' | 'samantekt'>('yfirferd')
  const [nafn, setNafn] = useState(session.name)
  const [endurnefna, setEndurnefna] = useState(false)
  const [nýttNafn, setNýttNafn] = useState(session.name)
  const [erAðEyða, setErAðEyða] = useState(false)

  async function eyðaLotu() {
    if (!confirm(ts('editConfirm'))) return
    setErAðEyða(true)
    await fetch(`/api/lotur?sessionId=${session.id}`, { method: 'DELETE' })
    router.push('/sessions')
  }

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
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <Link href="/sessions" className="flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300 mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" />
          {ts('breadcrumb')}
        </Link>

        <div className="mb-6">
          {endurnefna ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={nýttNafn}
                onChange={e => setNýttNafn(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') vistaEndurnefna(); if (e.key === 'Escape') setEndurnefna(false) }}
                className="text-2xl font-bold text-zinc-100 border-b-2 border-indigo-500 bg-transparent outline-none flex-1"
              />
              <button onClick={vistaEndurnefna} className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">{tc('save')}</button>
              <button onClick={() => setEndurnefna(false)} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">{tc('cancel')}</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 group">
              <h1 className="text-2xl font-bold text-zinc-100">{nafn}</h1>
              <button
                onClick={() => { setNýttNafn(nafn); setEndurnefna(true) }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-zinc-800 text-zinc-500 transition"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={eyðaLotu}
                disabled={erAðEyða}
                className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/10 text-zinc-500 hover:text-red-400 transition"
                title={ts('deleteTitle')}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
          <div className="text-sm text-zinc-500 mt-1">
            {tp(profileTranslationKey[session.profile] || session.profile)} · {new Date(session.createdAt).toLocaleDateString('is-IS')}
          </div>
        </div>

        {/* Animated Tabs */}
        <div className="flex gap-1 mb-6 bg-zinc-900 rounded-xl p-1 border border-zinc-800 relative">
          {tabs.map(f => (
            <button
              key={f}
              onClick={() => setFlipi(f)}
              className={`relative flex-1 py-2 text-sm font-medium rounded-lg transition-colors z-10 ${
                flipi === f ? 'text-zinc-100' : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {flipi === f && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-zinc-800 rounded-lg shadow-sm"
                  transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
                />
              )}
              <span className="relative z-10">{t(f)}</span>
            </button>
          ))}
        </div>

        {/* Content with fade */}
        <motion.div
          key={flipi}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Yfirferð */}
          {flipi === 'yfirferd' && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              {notes.length === 0 ? (
                <p className="text-zinc-500 text-sm">{t('noYfirferd')}</p>
              ) : (
                <>
                  <div className="flex justify-end mb-2">
                    <CopyButton text={allGlósur} />
                  </div>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{allGlósur}</p>
                </>
              )}
            </div>
          )}

          {/* Uppskrift */}
          {flipi === 'uppskrift' && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              {chunks.length === 0 ? (
                <p className="text-zinc-500 text-sm">{t('noUppskrift')}</p>
              ) : (
                <>
                  <div className="flex justify-end mb-2">
                    <CopyButton text={uppskrift} />
                  </div>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{uppskrift}</p>
                </>
              )}
            </div>
          )}

          {/* Samantekt */}
          {flipi === 'samantekt' && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
              {session.finalSummary ? (
                <>
                  <div className="flex justify-end mb-2">
                    <CopyButton text={session.finalSummary} />
                  </div>
                  <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{session.finalSummary}</p>
                </>
              ) : (
                <p className="text-zinc-500 text-sm">{t('noSamantekt')}</p>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  )
}
