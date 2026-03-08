'use client'

import { useState, useRef, useEffect } from 'react'
import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { locales } from '@/i18n/config'
import { motion, AnimatePresence } from 'motion/react'
import { Globe } from 'lucide-react'

const localeNames: Record<string, string> = {
  is: 'Íslenska',
  nb: 'Norsk',
  da: 'Dansk',
  sv: 'Svenska',
}

const localeShort: Record<string, string> = {
  is: 'IS',
  nb: 'NO',
  da: 'DA',
  sv: 'SV',
}

export default function LanguageSwitcher() {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  function onChange(newLocale: string) {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`
    router.replace(pathname, { locale: newLocale as any })
    setOpen(false)
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-400 hover:text-zinc-200 hover:border-zinc-700 transition-colors"
      >
        <Globe className="h-3.5 w-3.5" />
        {localeShort[locale]}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            aria-label="Language"
            initial={{ opacity: 0, scale: 0.95, y: -4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-1.5 w-36 rounded-xl border border-zinc-800 bg-zinc-900 p-1 shadow-xl shadow-black/20 z-50"
            onKeyDown={(e) => {
              if (e.key === 'Escape') setOpen(false)
            }}
          >
            {locales.map((l) => (
              <button
                key={l}
                role="option"
                aria-selected={l === locale}
                onClick={() => onChange(l)}
                className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                  l === locale
                    ? 'bg-indigo-500/10 text-indigo-400'
                    : 'text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200'
                }`}
              >
                <span className="text-xs font-mono text-zinc-600 w-5">{localeShort[l]}</span>
                {localeNames[l]}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
