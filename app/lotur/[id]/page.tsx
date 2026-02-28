import { auth } from '@clerk/nextjs/server'
import { notFound, redirect } from 'next/navigation'
import { getSession, getSessionChunks, getSessionNotes } from '@/lib/db/sessions'
import NiðurstaðaClient from './NiðurstaðaClient'

interface Props {
  params: Promise<{ id: string }>
}

export default async function LotaPage({ params }: Props) {
  const { userId } = await auth()
  if (!userId) redirect('/innskraning')

  const { id } = await params
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
