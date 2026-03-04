import { Link } from '@/i18n/navigation'
import { getTranslations } from 'next-intl/server'

export default async function NotFound() {
  const t = await getTranslations('errors')

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center px-4">
      <h1 className="text-6xl font-bold text-zinc-800 mb-4">{t('notFoundTitle')}</h1>
      <h2 className="text-xl font-semibold text-zinc-100 mb-2">{t('notFoundMessage')}</h2>
      <p className="text-zinc-500 mb-8">{t('notFoundDesc')}</p>
      <Link href="/" className="rounded-xl bg-indigo-600 px-5 py-2.5 text-white font-semibold hover:bg-indigo-700 transition">
        {t('goHome')}
      </Link>
    </div>
  )
}
