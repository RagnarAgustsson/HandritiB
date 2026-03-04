'use client'

import { useLocale } from 'next-intl'
import { usePathname, useRouter } from '@/i18n/navigation'
import { locales } from '@/i18n/config'

const localeNames: Record<string, string> = {
  is: 'Íslenska',
  nb: 'Norsk',
  da: 'Dansk',
  sv: 'Svenska',
}

export default function LanguageSwitcher() {
  const locale = useLocale()
  const pathname = usePathname()
  const router = useRouter()

  function onChange(newLocale: string) {
    document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000`
    router.replace(pathname, { locale: newLocale as any })
  }

  return (
    <select
      value={locale}
      onChange={(e) => onChange(e.target.value)}
      className="bg-zinc-900 border border-zinc-800 text-zinc-400 text-xs rounded-lg px-2 py-1.5 focus:outline-none focus:border-indigo-500/50 cursor-pointer"
    >
      {locales.map((l) => (
        <option key={l} value={l}>
          {localeNames[l]}
        </option>
      ))}
    </select>
  )
}
