'use client'

import { useState } from 'react'
import { Copy, Check, ShieldAlert } from 'lucide-react'
import { useTranslations } from 'next-intl'
import FormattedText from './FormattedText'

interface Props {
  transcript: string
  yfirferd: string
  samantekt: string
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button onClick={copy} className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition">
      {copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
    </button>
  )
}

// Flip to true to show the raw transcript tab again
const SHOW_TRANSCRIPT_TAB = false

const allTabs = ['yfirferd', 'uppskrift', 'samantekt'] as const
const visibleTabs = allTabs.filter(t => SHOW_TRANSCRIPT_TAB || t !== 'uppskrift')

export default function EphemeralResults({ transcript, yfirferd, samantekt }: Props) {
  const t = useTranslations('results')
  const [flipi, setFlipi] = useState<(typeof allTabs)[number]>('samantekt')

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
        <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-300">{t('ephemeralTitle')}</p>
          <p className="text-xs text-amber-400/70 mt-0.5">
            {t('ephemeralInfo')}
          </p>
        </div>
      </div>

      <div className="flex gap-1 bg-zinc-900 rounded-xl p-1 border border-zinc-800">
        {visibleTabs.map(f => (
          <button
            key={f}
            onClick={() => setFlipi(f)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
              flipi === f ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {t(f)}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        {flipi === 'yfirferd' && (
          yfirferd ? (
            <>
              <div className="flex justify-end mb-2"><CopyButton text={yfirferd} /></div>
              <FormattedText text={yfirferd} className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed" />
            </>
          ) : <p className="text-zinc-500 text-sm">{t('noYfirferd')}</p>
        )}
        {flipi === 'uppskrift' && (
          transcript ? (
            <>
              <div className="flex justify-end mb-2"><CopyButton text={transcript} /></div>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{transcript}</p>
            </>
          ) : <p className="text-zinc-500 text-sm">{t('noUppskrift')}</p>
        )}
        {flipi === 'samantekt' && (
          samantekt ? (
            <>
              <div className="flex justify-end mb-2"><CopyButton text={samantekt} /></div>
              <FormattedText text={samantekt} className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed" />
            </>
          ) : <p className="text-zinc-500 text-sm">{t('noSamantektShort')}</p>
        )}
      </div>
    </div>
  )
}
