import { ClerkProvider } from '@clerk/nextjs'
import { isIS } from '@clerk/localizations'
import { nbNO, daDK, svSE } from '@clerk/localizations'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, getTranslations, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { Geist, Geist_Mono } from 'next/font/google'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import PaddleLoader from '../components/PaddleLoader'
import IOSInstallPrompt from '../components/IOSInstallPrompt'
import { Analytics } from '@vercel/analytics/next'
import type { Metadata } from 'next'
import type { Locale } from '@/i18n/config'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

const clerkLocalizations: Record<string, any> = {
  is: isIS,
  nb: nbNO,
  da: daDK,
  sv: svSE,
}

const OG_LOCALE: Record<string, string> = {
  is: 'is_IS',
  nb: 'nb_NO',
  da: 'da_DK',
  sv: 'sv_SE',
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })

  return {
    title: t('title'),
    description: t('description'),
    openGraph: {
      title: t('ogTitle'),
      description: t('ogDescription'),
      locale: OG_LOCALE[locale] || 'is_IS',
      url: `https://handriti.is/${locale}`,
    },
    twitter: {
      title: t('ogTitle'),
      description: t('ogDescription'),
    },
    alternates: {
      canonical: `https://handriti.is/${locale}`,
      languages: Object.fromEntries(
        routing.locales.map(l => [l, `https://handriti.is/${l}`])
      ),
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  if (!routing.locales.includes(locale as any)) {
    notFound()
  }

  setRequestLocale(locale)
  const messages = await getMessages()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'Handriti',
    url: `https://handriti.is/${locale}`,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'ISK',
    },
    description: (messages as any).metadata?.description || '',
    inLanguage: locale,
    availableLanguage: ['is', 'nb', 'da', 'sv'],
  }

  return (
    <ClerkProvider localization={clerkLocalizations[locale] || isIS}>
      <html lang={locale}>
        <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-zinc-950 text-zinc-100 antialiased flex flex-col`}>
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          <NextIntlClientProvider messages={messages}>
            <Nav />
            <PaddleLoader />
            <main className="flex-1">{children}</main>
            <Footer />
            <IOSInstallPrompt />
          </NextIntlClientProvider>
          <Analytics />
        </body>
      </html>
    </ClerkProvider>
  )
}
