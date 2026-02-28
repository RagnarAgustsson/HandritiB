import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { isIS } from '@clerk/localizations'
import './globals.css'

export const metadata: Metadata = {
  title: 'Handriti',
  description: 'Íslenskur hljóðritari og samantektarforrit',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider localization={isIS}>
      <html lang="is">
        <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
