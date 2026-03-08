import type { Metadata } from 'next'
import './globals.css'

const SITE_URL = 'https://handriti.is'

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'Handriti',
    template: '%s | Handriti',
  },
  description: 'Handriti — AI transcription and summary',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    title: 'Handriti',
    statusBarStyle: 'black-translucent',
  },
  other: {
    'mobile-web-app-capable': 'yes',
  },
  openGraph: {
    type: 'website',
    siteName: 'Handriti',
    locale: 'is_IS',
    alternateLocale: ['nb_NO', 'da_DK', 'sv_SE'],
    url: SITE_URL,
  },
  twitter: {
    card: 'summary_large_image',
  },
  alternates: {
    canonical: SITE_URL,
    languages: {
      'is': `${SITE_URL}/is`,
      'nb': `${SITE_URL}/nb`,
      'da': `${SITE_URL}/da`,
      'sv': `${SITE_URL}/sv`,
    },
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
