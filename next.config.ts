import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      bodySizeLimit: '200mb',
    },
  },
  // Increase body size limit for API route handlers (Next.js 16)
  api: {
    bodyParser: {
      sizeLimit: '200mb',
    },
    responseLimit: '200mb',
  },
}

export default nextConfig
