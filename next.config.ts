import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./i18n/request.ts')

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '200mb',
    },
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
        ],
      },
    ]
  },
  async redirects() {
    return [
      { source: '/taka-upp', destination: '/is/record', permanent: true },
      { source: '/hlada-upp', destination: '/is/upload', permanent: true },
      { source: '/beinlina', destination: '/is/live', permanent: true },
      { source: '/lotur', destination: '/is/sessions', permanent: true },
      { source: '/lotur/:id', destination: '/is/sessions/:id', permanent: true },
      { source: '/askrift', destination: '/is/subscription', permanent: true },
      { source: '/skilmalar', destination: '/is/terms', permanent: true },
      { source: '/personuvernd', destination: '/is/privacy', permanent: true },
      { source: '/verdskra', destination: '/is/pricing', permanent: true },
      { source: '/innskraning', destination: '/is/sign-in', permanent: true },
      { source: '/nyskraning', destination: '/is/sign-up', permanent: true },
      { source: '/admin', destination: '/is/admin', permanent: true },
    ]
  },
}

export default withNextIntl(nextConfig)
