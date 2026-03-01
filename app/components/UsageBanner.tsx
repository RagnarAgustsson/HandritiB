'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface UsageData {
  usedMinutes: number
  limitMinutes: number
  remainingMinutes: number
  percentUsed: number
}

export default function UsageBanner() {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [freeAccess, setFreeAccess] = useState(false)

  useEffect(() => {
    fetch('/api/askrift')
      .then(r => r.json())
      .then(data => {
        if (data.hasFreeAccess || data.isAdmin) {
          setFreeAccess(true)
        } else {
          setUsage(data.usage)
        }
      })
      .catch(() => {})
  }, [])

  if (freeAccess || !usage) return null

  const pct = Math.min(usage.percentUsed, 100)
  const isWarning = pct >= 80
  const isBlocked = pct >= 100

  return (
    <div className={`rounded-xl border p-3 mb-6 ${
      isBlocked ? 'border-red-500/30 bg-red-500/5' :
      isWarning ? 'border-amber-500/30 bg-amber-500/5' :
      'border-zinc-800 bg-zinc-900'
    }`}>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-zinc-400">Notkun</span>
        <span className={isBlocked ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-zinc-400'}>
          {usage.usedMinutes} / {usage.limitMinutes} mín
        </span>
      </div>
      <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isBlocked ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-indigo-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isBlocked && (
        <Link href="/askrift" className="text-xs text-red-400 hover:text-red-300 mt-2 block">
          Uppfærðu áskrift til að halda áfram →
        </Link>
      )}
    </div>
  )
}
