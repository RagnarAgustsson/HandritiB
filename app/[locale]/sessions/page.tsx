import { auth } from '@clerk/nextjs/server'
import { redirect, Link } from '@/i18n/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getUserSessions } from '@/lib/db/sessions'
import { Mic, ChevronRight } from 'lucide-react'
import EyðaHnappur from './EyðaHnappur'

const profileTranslationKey: Record<string, string> = {
  'fundur': 'fundur',
  'fyrirlestur': 'fyrirlestur',
  'viðtal': 'vidtal',
  'frjálst': 'frjalst',
  'stjórnarfundur': 'stjornarfundur',
}

const statusKey: Record<string, string> = {
  virkt: 'statusActive',
  lokið: 'statusDone',
  villa: 'statusError',
}

interface Props {
  params: Promise<{ locale: string }>
}

export default async function LoturPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('sessions')
  const tp = await getTranslations('profiles')

  const { userId } = await auth()
  if (!userId) redirect({ href: '/sign-in', locale })

  const lotur = await getUserSessions(userId as string)

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-bold text-zinc-100">{t('title')}</h1>
          <Link href="/" className="text-sm text-indigo-400 hover:text-indigo-300 transition">{t('newSession')}</Link>
        </div>

        {lotur.length === 0 ? (
          <div className="text-center py-16 text-zinc-500">
            <p className="text-lg mb-2">{t('empty')}</p>
            <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm transition">{t('emptyLink')}</Link>
          </div>
        ) : (
          <div className="space-y-2">
            {lotur.map(lot => (
              <div key={lot.id} className="group relative flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 hover:bg-zinc-800/80 transition">
                <Link href={`/sessions/${lot.id}`} className="absolute inset-0 z-0" />
                <div className="shrink-0 text-zinc-600">
                  <Mic className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-zinc-100 truncate">{lot.name}</div>
                  <div className="text-sm text-zinc-500">
                    {tp(profileTranslationKey[lot.profile] || lot.profile)} · {new Date(lot.createdAt).toLocaleDateString('is-IS')}
                  </div>
                </div>
                <div className="relative z-10 flex items-center gap-2">
                  <EyðaHnappur sessionId={lot.id} />
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    lot.status === 'lokið' ? 'bg-emerald-500/10 text-emerald-400' :
                    lot.status === 'virkt' ? 'bg-indigo-500/10 text-indigo-400' :
                    'bg-red-500/10 text-red-400'
                  }`}>
                    {t(statusKey[lot.status] || 'statusActive')}
                  </span>
                  <ChevronRight className="h-4 w-4 text-zinc-700" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
