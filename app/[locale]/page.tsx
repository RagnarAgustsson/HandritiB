import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'
import { Mic, Upload, Zap, ArrowRight } from 'lucide-react'
import FadeIn from '../components/motion/FadeIn'
import AnimatedCard from '../components/motion/AnimatedCard'

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
        <FadeIn direction="none" duration={0.7}>
          <div className="hero-glow mb-3">
            <h1 className="text-5xl font-bold tracking-tight text-zinc-100">Handriti</h1>
          </div>
        </FadeIn>

        <FadeIn delay={0.15} direction="up">
          <p className="text-lg text-zinc-400 mb-12">{t('tagline')}</p>
        </FadeIn>

        <div className="grid gap-3">
          <AnimatedCard delay={0.25}>
            <Link
              href="/record"
              className="group card-glow flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800/80"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-500/10 transition-colors group-hover:bg-indigo-500/20">
                <Mic className="h-6 w-6 text-indigo-400" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-zinc-100">{t('record')}</div>
                <div className="text-sm text-zinc-400">{t('recordDesc')}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-700 transition-all group-hover:text-zinc-400 group-hover:translate-x-0.5" />
            </Link>
          </AnimatedCard>

          <AnimatedCard delay={0.35}>
            <Link
              href="/upload"
              className="group card-glow flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800/80"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 transition-colors group-hover:bg-emerald-500/20">
                <Upload className="h-6 w-6 text-emerald-400" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-zinc-100">{t('upload')}</div>
                <div className="text-sm text-zinc-400">{t('uploadDesc')}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-700 transition-all group-hover:text-zinc-400 group-hover:translate-x-0.5" />
            </Link>
          </AnimatedCard>

          <AnimatedCard delay={0.45}>
            <Link
              href="/live"
              className="group card-glow flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-left transition-colors hover:border-zinc-700 hover:bg-zinc-800/80"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 transition-colors group-hover:bg-violet-500/20">
                <Zap className="h-6 w-6 text-violet-400" />
              </div>
              <div className="flex-1">
                <div className="font-semibold text-zinc-100">{t('live')} <span className="text-xs font-normal text-violet-400">{t('liveBeta')}</span></div>
                <div className="text-sm text-zinc-400">{t('liveDesc')}</div>
              </div>
              <ArrowRight className="h-4 w-4 text-zinc-700 transition-all group-hover:text-zinc-400 group-hover:translate-x-0.5" />
            </Link>
          </AnimatedCard>
        </div>

        <FadeIn delay={0.6}>
          <Link
            href="/sessions"
            className="mt-8 inline-block text-sm text-zinc-500 hover:text-zinc-300 transition"
          >
            {t('viewSessions')}
          </Link>
        </FadeIn>
      </div>
    </main>
  )
}
