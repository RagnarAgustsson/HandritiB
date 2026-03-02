'use client'

import { useState } from 'react'
import { Copy, Check, ShieldAlert } from 'lucide-react'

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

export default function EphemeralResults({ transcript, yfirferd, samantekt }: Props) {
  const [flipi, setFlipi] = useState<'yfirferd' | 'uppskrift' | 'samantekt'>('samantekt')

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
        <ShieldAlert className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-amber-300">Tímabundin lota</p>
          <p className="text-xs text-amber-400/70 mt-0.5">
            Niðurstöður eru ekki vistaðar í kerfinu en hafa verið sendar í tölvupósti.
            Afritaðu það sem þú vilt halda áður en þú lokar glugganum.
          </p>
        </div>
      </div>

      <div className="flex gap-1 bg-zinc-900 rounded-xl p-1 border border-zinc-800">
        {(['yfirferd', 'uppskrift', 'samantekt'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFlipi(f)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition ${
              flipi === f ? 'bg-zinc-800 text-zinc-100 shadow-sm' : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            {f === 'yfirferd' ? 'Yfirferð' : f === 'uppskrift' ? 'Uppskrift' : 'Samantekt'}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
        {flipi === 'yfirferd' && (
          yfirferd ? (
            <>
              <div className="flex justify-end mb-2"><CopyButton text={yfirferd} /></div>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{yfirferd}</p>
            </>
          ) : <p className="text-zinc-500 text-sm">Engin yfirferð.</p>
        )}
        {flipi === 'uppskrift' && (
          transcript ? (
            <>
              <div className="flex justify-end mb-2"><CopyButton text={transcript} /></div>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{transcript}</p>
            </>
          ) : <p className="text-zinc-500 text-sm">Engin uppskrift.</p>
        )}
        {flipi === 'samantekt' && (
          samantekt ? (
            <>
              <div className="flex justify-end mb-2"><CopyButton text={samantekt} /></div>
              <p className="text-sm text-zinc-300 whitespace-pre-wrap leading-relaxed">{samantekt}</p>
            </>
          ) : <p className="text-zinc-500 text-sm">Engin samantekt.</p>
        )}
      </div>
    </div>
  )
}
