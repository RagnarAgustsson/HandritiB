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

// ── User context sanitization ────────────────────────────────

const MAX_CONTEXT_LENGTH = 2000

/**
 * Injection patterns to strip from user-provided context.
 * These catch common prompt-injection attempts in multiple languages.
 */
const INJECTION_PATTERNS: RegExp[] = [
  // Direct role/instruction overrides
  /\b(you are|du er|þú ert|du är)\b.*?\./gi,
  /\b(ignore|hunsa|ignorer|ignorera)\s+(all\s+)?(previous|prior|above|fyrri|earlier|foregående|ovanstående)\b/gi,
  /\b(system|assistant|user)\s*:/gi,
  /\b(new instructions?|nye instruksjoner|nýjar fyrirmæli|nya instruktioner)\b/gi,
  /\b(forget|disregard|override|gleyma|overskriv|åsidosätt)\s+(everything|all|alt|allt)\b/gi,
  /\b(do not|don't|ekki|inte|ikke)\s+(follow|fylgja|følg|följa)\b/gi,
  // Delimiter spoofing
  /={3,}\s*(system|nýjasti hluti|nyeste del|senaste delen)/gi,
  /---\s*(system|end|byrjun|slutt)/gi,
  // Code/markdown injection
  /```[\s\S]*?```/g,
  // Attempts to output specific formats
  /\b(respond|answer|svara|svar)\s+(only|exclusively|eingöngu|kun|bara)\s+(in|with|á|på|med)\b/gi,
]

/**
 * Sanitize user-provided context text for safe inclusion in prompts.
 * Strips injection attempts, limits length, returns clean data or empty string.
 */
export function sanitizeUserContext(input: unknown): string {
  if (typeof input !== 'string') return ''

  let text = input.trim()
  if (!text) return ''

  // Truncate to max length
  if (text.length > MAX_CONTEXT_LENGTH) {
    text = text.slice(0, MAX_CONTEXT_LENGTH)
  }

  // Strip injection patterns
  for (const pattern of INJECTION_PATTERNS) {
    text = text.replace(pattern, '')
  }

  // Collapse excessive whitespace left by stripping
  text = text.replace(/\n{3,}/g, '\n\n').trim()

  return text
}

/** Return a safe error message for client — log the real error server-side */
export function safeErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    console.error('[api-error]', err.message)
  }
  return 'Villa kom upp. Reyndu aftur.'
}
