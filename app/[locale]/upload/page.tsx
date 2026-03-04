import { auth } from '@clerk/nextjs/server'
import { redirect } from '@/i18n/navigation'
import { setRequestLocale } from 'next-intl/server'
import UploadTabs from './UploadTabs'
import UsageBanner from '@/app/components/UsageBanner'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function HlaðaUppPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const { userId } = await auth()
  if (!userId) redirect({ href: '/sign-in', locale })
  return (
    <>
      <div className="mx-auto max-w-2xl px-4 pt-10">
        <UsageBanner />
      </div>
      <UploadTabs />
    </>
  )
}
