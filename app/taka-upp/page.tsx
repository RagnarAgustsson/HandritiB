import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import TakaUppClient from './TakaUppClient'
import UsageBanner from '@/app/components/UsageBanner'

export default async function TakaUppPage() {
  const { userId } = await auth()
  if (!userId) redirect('/innskraning')

  return (
    <>
      <div className="mx-auto max-w-2xl px-4 pt-10">
        <UsageBanner />
      </div>
      <TakaUppClient />
    </>
  )
}
