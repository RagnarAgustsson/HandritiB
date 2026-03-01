import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import AskriftClient from './AskriftClient'

export const metadata = {
  title: 'Áskrift — Handriti',
}

export default async function AskriftPage() {
  const { userId } = await auth()
  if (!userId) redirect('/innskraning')

  return <AskriftClient />
}
