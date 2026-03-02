import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { isIS } from '@clerk/localizations'
import Nav from './components/Nav'
import Footer from './components/Footer'
import PaddleLoader from './components/PaddleLoader'
import IOSInstallPrompt from './components/IOSInstallPrompt'
import './globals.css'

export const metadata: Metadata = {
  title: 'Handriti',
  description: 'Íslenskur hljóðritari og samantektarforrit',
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
  return (
    <ClerkProvider localization={isIS}>
      <html lang="is">
        <body className="min-h-screen bg-zinc-950 text-zinc-100 antialiased flex flex-col">
          <Nav />
          <PaddleLoader />
          <main className="flex-1">{children}</main>
          <Footer />
          <IOSInstallPrompt />
        </body>
      </html>
    </ClerkProvider>
  )
}
