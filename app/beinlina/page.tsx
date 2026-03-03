import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Lock } from 'lucide-react'
import BeinlinaClient from './BeinlinaClient'
import UsageBanner from '@/app/components/UsageBanner'
import { checkBeinlinaAccess } from '@/lib/subscription/check-access'

export default async function BeinlinaPage() {
  const { userId } = await auth()
  if (!userId) redirect('/innskraning')

  const { allowed } = await checkBeinlinaAccess(userId)

  if (!allowed) {
    return (
      <div className="mx-auto max-w-md px-4 pt-20 text-center">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8">
          <Lock className="mx-auto h-10 w-10 text-zinc-600 mb-4" />
          <h2 className="text-lg font-semibold text-zinc-100 mb-2">Aðeins fyrir áskrifendur</h2>
          <p className="text-sm text-zinc-400 mb-6">
            Beinlína er aðeins í boði fyrir áskrifendur. Uppfærðu áskriftina þína til að fá aðgang.
          </p>
          <Link
            href="/verdskra"
            className="inline-block rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition"
          >
            Skoða verðskrá
          </Link>
        </div>
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
