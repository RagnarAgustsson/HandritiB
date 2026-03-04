import { getTranslations } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

export default async function Footer() {
  const t = await getTranslations('footer')

  return (
    <footer className="border-t border-zinc-800/50 bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-6 flex items-center justify-between text-xs text-zinc-500">
        <span>{t('copyright', { year: new Date().getFullYear() })}</span>
        <div className="flex gap-4">
          <Link href="/terms" className="hover:text-zinc-300 transition">
            {t('terms')}
          </Link>
          <Link href="/privacy" className="hover:text-zinc-300 transition">
            {t('privacy')}
          </Link>
        </div>
      </div>
    </footer>
  )
}
