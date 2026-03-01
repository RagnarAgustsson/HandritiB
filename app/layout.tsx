import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { isIS } from '@clerk/localizations'
import Nav from './components/Nav'
import Footer from './components/Footer'
import PaddleLoader from './components/PaddleLoader'
import './globals.css'

export const metadata: Metadata = {
  title: 'Handriti',
  description: 'Íslenskur hljóðritari og samantektarforrit',
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
        </body>
      </html>
    </ClerkProvider>
  )
}
