import type { PromptProfile } from './prompts'

const VALID_PROFILES: PromptProfile[] = ['fundur', 'fyrirlestur', 'viðtal', 'frjálst', 'stjórnarfundur']

/** Validate and return a safe profile, defaulting to 'fundur' */
export function validateProfile(input: unknown): PromptProfile {
  if (typeof input === 'string' && VALID_PROFILES.includes(input as PromptProfile)) {
    return input as PromptProfile
  }
  return 'fundur'
}

/** Validate that a blob URL belongs to Vercel Blob storage */
export function validateBlobUrl(url: string): boolean {
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && parsed.hostname.endsWith('.vercel-storage.com')
  } catch {
    return false
  }
}

/** Return a safe error message for client — log the real error server-side */
export function safeErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    console.error('[api-error]', err.message)
  }
  return 'Villa kom upp. Reyndu aftur.'
}
