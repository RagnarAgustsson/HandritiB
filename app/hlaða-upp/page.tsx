import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import HlaðaUppClient from './HlaðaUppClient'

export default async function HlaðaUppPage() {
  const { userId } = await auth()
  if (!userId) redirect('/innskraning')
  return <HlaðaUppClient />
}
