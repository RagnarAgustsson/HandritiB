import { auth } from '@clerk/nextjs/server'
import { redirect } from '@/i18n/navigation'
import { setRequestLocale } from 'next-intl/server'
import AskriftClient from './AskriftClient'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function AskriftPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)

  const { userId } = await auth()
  if (!userId) redirect({ href: '/sign-in', locale })

  return <AskriftClient />
}
