import { Check } from 'lucide-react'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { Link } from '@/i18n/navigation'

interface Props {
  params: Promise<{ locale: string }>
}

export default async function VerdskraPage({ params }: Props) {
  const { locale } = await params
  setRequestLocale(locale)
  const t = await getTranslations('pricing')

  const trialFeatures = [
    t('trialFeature1'),
    t('trialFeature2'),
    t('trialFeature3'),
    t('trialFeature4'),
  ]

  const paidFeatures = [
    t('trialFeature1'),
    t('trialFeature2'),
    t('subFeatureRealtime'),
    t('trialFeature3'),
    t('subFeatureMore'),
  ]

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <div className="text-center mb-12">
          <h1 className="text-2xl font-bold text-zinc-100 mb-3">{t('title')}</h1>
          <p className="text-zinc-400">
            {t('subtitle')}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {/* Prufa */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-6">
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-zinc-100">{t('trialName')}</h2>
              <p className="text-sm text-zinc-500 mt-1">{t('trialDesc')}</p>
              <div className="mt-4">
                <span className="text-3xl font-bold text-zinc-100">{t('trialPrice')}</span>
              </div>
            </div>
            <ul className="space-y-3 mb-6">
              {trialFeatures.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                  <Check className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/sign-up"
              className="block text-center rounded-xl border border-zinc-700 px-6 py-2.5 text-sm font-semibold text-zinc-300 hover:bg-zinc-800 transition"
            >
              {t('trialButton')}
            </Link>
          </div>

          {/* Áskrift */}
          <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-6 relative">
            <div className="absolute -top-3 left-6 px-3 py-0.5 rounded-full bg-indigo-500 text-xs font-semibold text-white">
              {t('recommended')}
            </div>
            <div className="mb-6">
              <h2 className="text-lg font-semibold text-zinc-100">{t('subName')}</h2>
              <p className="text-sm text-zinc-500 mt-1">{t('subDesc')}</p>
              <div className="mt-4">
                <span className="text-3xl font-bold text-zinc-100">{t('subPricePlaceholder')}</span>
                <span className="text-sm text-zinc-500 ml-2">{t('subPricePeriod')}</span>
              </div>
              <p className="text-xs text-zinc-500 mt-1">{t('subPriceNote')}</p>
            </div>
            <ul className="space-y-3 mb-6">
              {paidFeatures.map((f, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-zinc-300">
                  <Check className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              disabled
              className="block w-full text-center rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white opacity-50 cursor-not-allowed"
            >
              {t('comingSoon')}
            </button>
          </div>
        </div>

        <div className="mt-10 text-center text-xs text-zinc-600">
          {t('paddleNote')}<br />
          {t('vatNote')}
        </div>
      </div>
    </div>
  )
}
