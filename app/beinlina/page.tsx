import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import BeinlinaClient from './BeinlinaClient'

export default async function BeinlinaPage() {
  const { userId } = await auth()
  if (!userId) redirect('/innskraning')
  return <BeinlinaClient />
}
