import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUserSessions } from '@/lib/db/sessions'
import { Mic, ChevronRight } from 'lucide-react'

const profileNöfn: Record<string, string> = {
  fundur: 'Fundur',
  fyrirlestur: 'Fyrirlestur',
  viðtal: 'Viðtal',
  frjálst: 'Frjálst',
}

const statusMerki: Record<string, string> = {
  virkt: 'Í gangi',
  lokið: 'Lokið',
  villa: 'Villa',
}

export default async function LoturPage() {
  const { userId } = await auth()
  if (!userId) redirect('/innskraning')

  const lotur = await getUserSessions(userId)

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-zinc-100">Mínar lotur</h1>
          <Link href="/" className="text-sm text-indigo-400 hover:text-indigo-300 transition">Ný lota</Link>
        </div>

        {lotur.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-lg mb-2">Engar lotur enn</p>
            <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm transition">Byrjaðu fyrstu lotuna →</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {lotur.map(lot => (
              <Link
                key={lot.id}
                href={`/lotur/${lot.id}`}
                className="flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 hover:bg-zinc-800/80 transition"
              >
                <div className="shrink-0 text-zinc-600">
                  <Mic className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-zinc-100 truncate">{lot.name}</div>
                  <div className="text-sm text-zinc-500">
                    {profileNöfn[lot.profile]} · {new Date(lot.createdAt).toLocaleDateString('is-IS')}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    lot.status === 'lokið' ? 'bg-emerald-500/10 text-emerald-400' :
                    lot.status === 'virkt' ? 'bg-indigo-500/10 text-indigo-400' :
                    'bg-red-500/10 text-red-400'
                  }`}>
                    {statusMerki[lot.status]}
                  </span>
                  <ChevronRight className="h-4 w-4 text-zinc-700" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
