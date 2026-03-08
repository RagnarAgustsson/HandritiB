import { ClerkProvider } from '@clerk/nextjs'
import { isIS } from '@clerk/localizations'
import { nbNO, daDK, svSE } from '@clerk/localizations'
import { NextIntlClientProvider } from 'next-intl'
import { getMessages, setRequestLocale } from 'next-intl/server'
import { notFound } from 'next/navigation'
import { routing } from '@/i18n/routing'
import { Geist, Geist_Mono } from 'next/font/google'
import Nav from '../components/Nav'
import Footer from '../components/Footer'
import PaddleLoader from '../components/PaddleLoader'
import IOSInstallPrompt from '../components/IOSInstallPrompt'
import { Analytics } from '@vercel/analytics/next'
import type { Locale } from '@/i18n/config'

const geistSans = Geist({ subsets: ['latin'], variable: '--font-geist-sans' })
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' })

const clerkLocalizations: Record<string, any> = {
  is: isIS,
  nb: nbNO,
  da: daDK,
  sv: svSE,
}

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
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

  return (
    <ClerkProvider localization={clerkLocalizations[locale] || isIS}>
      <html lang={locale}>
        <body className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-zinc-950 text-zinc-100 antialiased flex flex-col`}>
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
