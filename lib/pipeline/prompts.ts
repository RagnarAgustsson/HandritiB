// Dispatcher sem velur rétta prompt-skrá eftir locale.
// Per-locale prompts eru í prompts-is.ts, prompts-nb.ts, prompts-da.ts, prompts-sv.ts.
//
// Arkitektúr:
//   system prompt = stöðugar fyrirmæli (cacheable, breytast ekki milli kalla)
//   user message  = gögnin sem á að vinna úr (breytast í hvert skipti)

import type { Locale } from '@/i18n/config'
import * as is from './prompts-is'
import * as nb from './prompts-nb'
import * as da from './prompts-da'
import * as sv from './prompts-sv'

// ── Snið (profile) ─────────────────────────────────────────────────

export type PromptProfile = 'fundur' | 'fyrirlestur' | 'viðtal' | 'frjálst' | 'stjórnarfundur'

// ── Locale prompt modules ──────────────────────────────────────────

interface LocalePrompts {
  LANGUAGE_INSTRUCTIONS: string
  profileContext: Record<string, string>
  buildTranscriptPrompt: () => string
  buildNotesSystemPrompt: (profile: string, userContext?: string) => string
  buildFinalSummarySystemPrompt: (profile: string, userContext?: string) => string
  BEINLINA_INSTRUCTIONS: string
}

const localeModules: Record<Locale, LocalePrompts> = { is, nb, da, sv }

function getModule(locale: Locale = 'is'): LocalePrompts {
  return localeModules[locale] || localeModules.is
}

// ── Backwards-compatible exports (default = Icelandic) ─────────────

/** @deprecated Use getLanguageInstructions(locale) instead */
export const ISLENSKA_FYRIRMÆLI = is.LANGUAGE_INSTRUCTIONS

// ── Hjálparföll (locale-independent) ───────────────────────────────

export function sanitizeTranscriptParts(parts: string[]): string[] {
  return parts
    .map((part) => (part ?? '').trim())
    .filter((part) => part.length > 0)
}

export function buildContextBlock(previousTranscripts: string[], count = 2): string {
  const clean = sanitizeTranscriptParts(previousTranscripts)
  if (clean.length === 0) return ''
  return clean.slice(-count).join('\n\n---\n\n')
}

// ── Locale-aware prompt builders ───────────────────────────────────

export function getLanguageInstructions(locale: Locale = 'is'): string {
  return getModule(locale).LANGUAGE_INSTRUCTIONS
}

export function buildTranscriptPrompt(locale: Locale = 'is'): string {
  return getModule(locale).buildTranscriptPrompt()
}

export function buildNotesSystemPrompt(profile: PromptProfile, locale: Locale = 'is', userContext?: string): string {
  return getModule(locale).buildNotesSystemPrompt(profile, userContext)
}

export function buildFinalSummarySystemPrompt(profile: PromptProfile, locale: Locale = 'is', userContext?: string): string {
  return getModule(locale).buildFinalSummarySystemPrompt(profile, userContext)
}

export function getBeinlinaInstructions(locale: Locale = 'is'): string {
  return getModule(locale).BEINLINA_INSTRUCTIONS
}

/** @deprecated Use getBeinlinaInstructions(locale) instead */
export const BEINLINA_INSTRUCTIONS = is.BEINLINA_INSTRUCTIONS
