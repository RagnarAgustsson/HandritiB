import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUserSessions } from '@/lib/db/sessions'
import { Mic, Upload, Zap, ChevronRight } from 'lucide-react'

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
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Mínar lotur</h1>
          <Link href="/" className="text-sm text-blue-600 hover:underline">Ný lota</Link>
        </div>

        {lotur.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-lg mb-2">Engar lotur enn</p>
            <Link href="/" className="text-blue-600 hover:underline text-sm">Byrjaðu fyrstu lotuna →</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {lotur.map(lot => (
              <Link
                key={lot.id}
                href={`/lotur/${lot.id}`}
                className="flex items-center gap-4 rounded-xl border border-gray-200 bg-white p-4 hover:border-gray-300 hover:shadow-sm transition"
              >
                <div className="shrink-0 text-gray-400">
                  <Mic className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-gray-900 truncate">{lot.name}</div>
                  <div className="text-sm text-gray-400">
                    {profileNöfn[lot.profile]} · {new Date(lot.createdAt).toLocaleDateString('is-IS')}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    lot.status === 'lokið' ? 'bg-green-50 text-green-700' :
                    lot.status === 'virkt' ? 'bg-blue-50 text-blue-700' :
                    'bg-red-50 text-red-700'
                  }`}>
                    {statusMerki[lot.status]}
                  </span>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
