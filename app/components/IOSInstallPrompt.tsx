'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import { useTranslations } from 'next-intl'

const STORAGE_KEY = 'handriti-install-dismissed'

function isIOSSafari(): boolean {
  if (typeof navigator === 'undefined') return false
  const ua = navigator.userAgent
  const isIOS = /iPhone|iPad|iPod/.test(ua)
  const isSafari = /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua)
  return isIOS && isSafari
}

function isStandalone(): boolean {
  if (typeof window === 'undefined') return false
  return ('standalone' in window.navigator && (window.navigator as any).standalone === true)
    || window.matchMedia('(display-mode: standalone)').matches
}

export default function IOSInstallPrompt() {
  const t = useTranslations('ios')
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isStandalone()) return
    if (!isIOSSafari()) return
    if (localStorage.getItem(STORAGE_KEY)) return

    const timer = setTimeout(() => setShow(true), 3000)
    return () => clearTimeout(timer)
  }, [])

  function dismiss() {
    setShow(false)
    localStorage.setItem(STORAGE_KEY, '1')
  }

  if (!show) return null

  return (
    <div className="fixed bottom-0 inset-x-0 z-50 p-4 pb-[env(safe-area-inset-bottom,16px)] animate-in slide-in-from-bottom">
      <div className="mx-auto max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-4 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <p className="font-medium text-zinc-100 text-sm">{t('addToHome')}</p>
            <p className="text-xs text-zinc-400 mt-1">
              {t('tapOn')}{' '}
              <span className="inline-flex items-center justify-center w-5 h-5 rounded border border-zinc-700 bg-zinc-800 text-zinc-300 text-[10px] align-middle mx-0.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              </span>
              {' '}{t('addAction')}
            </p>
          </div>
          <button
            onClick={dismiss}
            className="p-1 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition shrink-0"
            aria-label={t('close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
