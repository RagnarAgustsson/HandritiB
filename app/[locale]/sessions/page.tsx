import { auth } from '@clerk/nextjs/server'
import { redirect, Link } from '@/i18n/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { getUserSessions } from '@/lib/db/sessions'
import { Mic, ChevronRight } from 'lucide-react'
import FadeIn from '../../components/motion/FadeIn'
import { StaggerContainer, StaggerItem } from '../../components/motion/StaggerList'
import EyðaHnappur from './EyðaHnappur'

const LOCALE_DATE: Record<string, string> = {
  is: 'is-IS', nb: 'nb-NO', da: 'da-DK', sv: 'sv-SE',
}

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

function relativeTime(date: Date, locale: string): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  const diffHrs = Math.floor(diffMs / 3_600_000)
  const diffDays = Math.floor(diffMs / 86_400_000)

  const labels: Record<string, { now: string; min: string; hrs: string; days: string; day: string }> = {
    is: { now: 'Rétt í þessu', min: 'mín síðan', hrs: 'klst síðan', days: 'dögum síðan', day: 'degi síðan' },
    nb: { now: 'Akkurat nå', min: 'min siden', hrs: 'timer siden', days: 'dager siden', day: 'dag siden' },
    da: { now: 'Lige nu', min: 'min siden', hrs: 'timer siden', days: 'dage siden', day: 'dag siden' },
    sv: { now: 'Just nu', min: 'min sedan', hrs: 'timmar sedan', days: 'dagar sedan', day: 'dag sedan' },
  }
  const l = labels[locale] || labels.is

  if (diffMin < 1) return l.now
  if (diffMin < 60) return `${diffMin} ${l.min}`
  if (diffHrs < 24) return `${diffHrs} ${diffHrs === 1 ? l.day.replace('degi', 'klst') : l.hrs}`
  if (diffDays <= 7) return `${diffDays} ${diffDays === 1 ? l.day : l.days}`
  return date.toLocaleDateString(LOCALE_DATE[locale] || 'is-IS')
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
        <FadeIn>
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-2xl font-bold text-zinc-100">{t('title')}</h1>
            <Link href="/" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors">{t('newSession')}</Link>
          </div>
        </FadeIn>

        {lotur.length === 0 ? (
          <FadeIn delay={0.1}>
            <div className="text-center py-20 text-zinc-500">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/50">
                <Mic className="h-7 w-7 text-zinc-600" />
              </div>
              <p className="text-lg mb-2">{t('empty')}</p>
              <Link href="/" className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors">{t('emptyLink')}</Link>
            </div>
          </FadeIn>
        ) : (
          <StaggerContainer className="space-y-2">
            {lotur.map(lot => (
              <StaggerItem key={lot.id}>
                <div className="group relative flex items-center gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 hover:border-zinc-700 hover:bg-zinc-800/80 transition-colors">
                  <Link href={`/sessions/${lot.id}`} className="absolute inset-0 z-0" />
                  <div className="shrink-0 text-zinc-600 group-hover:text-zinc-400 transition-colors">
                    <Mic className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-zinc-100 truncate">{lot.name}</div>
                    <div className="text-sm text-zinc-500">
                      {tp(profileTranslationKey[lot.profile] || lot.profile)} · {relativeTime(new Date(lot.createdAt), locale)}
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
                    <ChevronRight className="h-4 w-4 text-zinc-700 group-hover:text-zinc-500 transition-colors" />
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerContainer>
        )}
      </div>
    </div>
  )
}
