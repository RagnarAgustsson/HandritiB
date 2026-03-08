'use client'

import { useState, useEffect } from 'react'
import { Link } from '@/i18n/navigation'
import { useTranslations } from 'next-intl'
import AnimatedProgress from './motion/AnimatedProgress'

interface UsageData {
  usedMinutes: number
  limitMinutes: number
  remainingMinutes: number
  percentUsed: number
}

export default function UsageBanner() {
  const t = useTranslations('usage')
  const tc = useTranslations('common')
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
    <div className={`rounded-xl border p-3 mb-6 transition-colors ${
      isBlocked ? 'border-red-500/30 bg-red-500/5' :
      isWarning ? 'border-amber-500/30 bg-amber-500/5' :
      'border-zinc-800 bg-zinc-900'
    }`}>
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-zinc-400">{t('label')}</span>
        <span className={isBlocked ? 'text-red-400' : isWarning ? 'text-amber-400' : 'text-zinc-400'}>
          {usage.usedMinutes} / {usage.limitMinutes} {tc('min')}
        </span>
      </div>
      <AnimatedProgress
        percent={pct}
        colorClass={isBlocked ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-indigo-500'}
      />
      {isBlocked && (
        <Link href="/subscription" className="text-xs text-red-400 hover:text-red-300 mt-2 block">
          {t('upgradeLink')}
        </Link>
      )}
    </div>
  )
}
