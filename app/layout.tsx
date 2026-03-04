import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Handriti',
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
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children
}
