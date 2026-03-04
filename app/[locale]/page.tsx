import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { Mic, Upload, Zap } from 'lucide-react'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function Home({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('home')

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-lg text-center">
        <h1 className="text-5xl font-bold tracking-tight text-zinc-100 mb-3">Handriti</h1>
        <p className="text-lg text-zinc-400 mb-12">{t('tagline')}</p>

        <div className="grid gap-3">
          <Link
            href="/record"
            className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-left transition hover:border-zinc-700 hover:bg-zinc-800/80"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10">
              <Mic className="h-6 w-6 text-indigo-400" />
            </div>
            <div>
              <div className="font-semibold text-zinc-100">{t('record')}</div>
              <div className="text-sm text-zinc-400">{t('recordDesc')}</div>
            </div>
          </Link>

          <Link
            href="/upload"
            className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-left transition hover:border-zinc-700 hover:bg-zinc-800/80"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
              <Upload className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <div className="font-semibold text-zinc-100">{t('upload')}</div>
              <div className="text-sm text-zinc-400">{t('uploadDesc')}</div>
            </div>
          </Link>

          <Link
            href="/live"
            className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-left transition hover:border-zinc-700 hover:bg-zinc-800/80"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/10">
              <Zap className="h-6 w-6 text-violet-400" />
            </div>
            <div>
              <div className="font-semibold text-zinc-100">{t('live')} <span className="text-xs font-normal text-violet-400">{t('liveBeta')}</span></div>
              <div className="text-sm text-zinc-400">{t('liveDesc')}</div>
            </div>
          </Link>
        </div>

        <Link
          href="/sessions"
          className="mt-8 inline-block text-sm text-zinc-500 hover:text-zinc-300 transition"
        >
          {t('viewSessions')}
        </Link>
      </div>
    </main>
  )
}
