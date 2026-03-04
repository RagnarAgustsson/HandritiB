'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import HlaðaUppClient from './HlaðaUppClient'
import StorSkraClient from './StorSkraClient'

type Tab = 'venjuleg' | 'stor'

export default function UploadTabs() {
  const [tab, setTab] = useState<Tab>('venjuleg')
  const t = useTranslations('upload')

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-zinc-100 mb-6">{t('title')}</h1>

        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setTab('venjuleg')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === 'venjuleg'
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
            }`}
          >
            {t('tabSmall')}
          </button>
          <button
            onClick={() => setTab('stor')}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              tab === 'stor'
                ? 'bg-indigo-600 text-white'
                : 'bg-zinc-900 border border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
            }`}
          >
            {t('tabLarge')}
          </button>
        </div>

        {tab === 'venjuleg' ? <HlaðaUppClient /> : <StorSkraClient />}
      </div>
    </div>
  )
}
