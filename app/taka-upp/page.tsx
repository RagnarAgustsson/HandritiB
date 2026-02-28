import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import TakaUppClient from './TakaUppClient'

export default async function TakaUppPage() {
  const { userId } = await auth()
  if (!userId) redirect('/innskraning')

  return <TakaUppClient />
}
