import { auth } from '@clerk/nextjs/server'
import { notFound } from 'next/navigation'
import { redirect } from '@/i18n/navigation'
import { setRequestLocale } from 'next-intl/server'
import { getSession, getSessionChunks, getSessionNotes } from '@/lib/db/sessions'
import NiðurstaðaClient from './NiðurstaðaClient'

interface Props {
  params: Promise<{ id: string; locale: string }>
}

export default async function LotaPage({ params }: Props) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const { userId } = await auth()
  if (!userId) redirect({ href: '/sign-in', locale })

  const [session, chunks, notes] = await Promise.all([
    getSession(id),
    getSessionChunks(id),
    getSessionNotes(id),
  ])

  if (!session || session.userId !== userId) notFound()

  return (
    <NiðurstaðaClient
      session={session}
      chunks={chunks}
      notes={notes}
    />
  )
}
