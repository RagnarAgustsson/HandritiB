import { UserButton } from '@clerk/nextjs'
import { getAdminStatus } from '@/lib/auth/admin-check'
import { getTranslations, getLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import Logo from './Logo'
import LanguageSwitcher from './LanguageSwitcher'

export default async function Nav() {
  const { isAdmin } = await getAdminStatus()
  const locale = await getLocale()
  const t = await getTranslations('nav')

  return (
    <nav className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm px-4 py-3">
      <div className="mx-auto max-w-2xl flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-zinc-100 tracking-tight">
          <Logo size={28} />
          Handriti
        </Link>
        <div className="flex items-center gap-4">
          <Link href="/sessions" className="text-sm text-zinc-400 hover:text-zinc-100 transition">{t('sessions')}</Link>
          <Link href="/subscription" className="text-sm text-zinc-400 hover:text-zinc-100 transition">{t('subscription')}</Link>
          {isAdmin && (
            <Link href="/admin" className="text-sm text-indigo-400 hover:text-indigo-300 transition">{t('admin')}</Link>
          )}
          <LanguageSwitcher />
          <UserButton afterSignOutUrl={`/${locale}/sign-in`} />
        </div>
      </div>
    </nav>
  )
}
