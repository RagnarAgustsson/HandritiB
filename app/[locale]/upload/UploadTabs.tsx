'use client'

import { useTranslations } from 'next-intl'
import UploadClient from './UploadClient'

export default function UploadTabs() {
  const t = useTranslations('upload')

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-zinc-100 mb-6">{t('title')}</h1>
        <UploadClient />
      </div>
    </div>
  )
}
