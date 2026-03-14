import { del } from '@vercel/blob'
import type { Locale } from '@/i18n/config'
import { locales, defaultLocale } from '@/i18n/config'

const encoder = new TextEncoder()

export function validateLocale(input: unknown): Locale {
  if (typeof input === 'string' && (locales as readonly string[]).includes(input)) {
    return input as Locale
  }
  return defaultLocale
}

export function sseEvent(data: object): Uint8Array {
  return encoder.encode(`data: ${JSON.stringify(data)}\n\n`)
}

/**
 * Delete a Vercel Blob with retry (2 attempts).
 * Logs failures but never throws — safe for fire-and-forget usage.
 */
export function deleteBlob(blobUrl: string): void {
  del(blobUrl).catch(async (e) => {
    console.warn('[blob-delete] First attempt failed, retrying:', blobUrl, e?.message)
    try {
      await del(blobUrl)
    } catch (retryErr) {
      console.error('[blob-delete] Retry failed — blob orphaned:', blobUrl, retryErr)
    }
  })
}
