import { auth } from '@clerk/nextjs/server'
import { redirect } from '@/i18n/navigation'
import { Link } from '@/i18n/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Lock } from 'lucide-react'
import BeinlinaClient from './BeinlinaClient'
import UsageBanner from '@/app/components/UsageBanner'
import FadeIn from '../../components/motion/FadeIn'
import { checkBeinlinaAccess } from '@/lib/subscription/check-access'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function BeinlinaPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('live')

  const { userId } = await auth()
  if (!userId) redirect({ href: '/sign-in', locale })

  const { allowed } = await checkBeinlinaAccess(userId as string)

  if (!allowed) {
    return (
      <div className="mx-auto max-w-md px-4 pt-20 text-center">
        <FadeIn>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
            <Lock className="mx-auto h-10 w-10 text-zinc-600 mb-4" />
            <h2 className="text-lg font-semibold text-zinc-100 mb-2">{t('subscribersOnly')}</h2>
            <p className="text-sm text-zinc-400 mb-6">
              {t('subscribersOnlyDesc')}
            </p>
            <Link
              href="/pricing"
              className="inline-block rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
            >
              {t('viewPricing')}
            </Link>
          </div>
        </FadeIn>
      </div>
    )
  }

  return (
    <>
      <div className="mx-auto max-w-2xl px-4 pt-10">
        <UsageBanner />
      </div>
      <BeinlinaClient />
    </>
  )
}
