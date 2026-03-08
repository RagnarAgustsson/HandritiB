import type { MetadataRoute } from 'next'
import { locales } from '@/i18n/config'

const SITE_URL = 'https://handriti.is'

const publicPages = ['', '/pricing', '/terms', '/privacy']

export default function sitemap(): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = []

  for (const page of publicPages) {
    entries.push({
      url: `${SITE_URL}/is${page}`,
      lastModified: new Date(),
      alternates: {
        languages: Object.fromEntries(
          locales.map(l => [l, `${SITE_URL}/${l}${page}`])
        ),
      },
    })
  }

  return entries
}
