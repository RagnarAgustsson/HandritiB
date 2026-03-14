import { openai } from '@/lib/openai/client'
import type { Locale } from '@/i18n/config'

// ── Retry logic for transient API errors ────────────────────
const MAX_RETRIES = 3
const BASE_DELAY_MS = 1000

function isTransientError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  const msg = error.message
  // 429 rate limit, 5xx server errors, network errors
  if (msg.includes('429') || msg.includes('rate') || msg.includes('Rate')) return true
  if (msg.includes('500') || msg.includes('502') || msg.includes('503') || msg.includes('504')) return true
  if (msg.includes('ECONNRESET') || msg.includes('ETIMEDOUT') || msg.includes('fetch failed')) return true
  // Check status code on API errors
  if ('status' in error && typeof (error as any).status === 'number') {
    const status = (error as any).status
    if (status === 429 || status >= 500) return true
  }
  return false
}

async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      if (attempt < MAX_RETRIES && isTransientError(error)) {
        const delay = BASE_DELAY_MS * Math.pow(2, attempt) + Math.random() * 500
        await new Promise(resolve => setTimeout(resolve, delay))
        continue
      }
      throw error
    }
  }
  throw lastError
}

// gpt-4o-transcribe er mun betri en whisper-1 fyrir íslensku —
// skilur samhengi, leiðréttir sjálfkrafa og þekkir fleiri orð.
// Hámarkslengd: 1400 sek. Ef lengra → fallback á whisper-1.
const PRIMARY_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-transcribe'
const FALLBACK_MODEL = 'whisper-1'

// ── Per-locale transcription prompts ─────────────────────────────

const ISLENSKA_PROMPT = `Þetta er íslenskt tal. Skráðu nákvæmlega það sem sagt er á vandaðri íslensku.
Notaðu rétta stafsetningu, greinarmerki og fallbeygingu.
Leiðréttu talmálsvillur en breyttu ekki merkingu eða orðavali.
Íslenskar orðmyndir: þ, ð, æ, ö, á, é, í, ó, ú, ý.`

const NORSK_PROMPT = `Dette er norsk tale. Skriv ned nøyaktig det som blir sagt på korrekt norsk bokmål.
Bruk riktig rettskrivning, tegnsetting og bøyning.
Rett talespråksfeil, men ikke endre mening eller ordvalg.`

const DANSK_PROMPT = `Dette er dansk tale. Skriv ned nøjagtigt det, der bliver sagt, på korrekt dansk.
Brug korrekt retskrivning, tegnsætning og bøjning.
Ret talesprogsfejl, men ændr ikke mening eller ordvalg.`

const SVENSK_PROMPT = `Detta är svenskt tal. Skriv ned exakt det som sägs på korrekt svenska.
Använd korrekt stavning, interpunktion och böjning.
Rätta talspråksfel men ändra inte innebörd eller ordval.`

// Map locale → OpenAI language code
const LANGUAGE_MAP: Record<Locale, string> = {
  is: 'is',
  nb: 'no',
  da: 'da',
  sv: 'sv',
}

// Map locale → transcription prompt
const PROMPT_MAP: Record<Locale, string> = {
  is: ISLENSKA_PROMPT,
  nb: NORSK_PROMPT,
  da: DANSK_PROMPT,
  sv: SVENSK_PROMPT,
}

/**
 * Fjarlægja transcription prompt ef Whisper endurvarpar honum í úttakið.
 * Tekur við promptinu sem var notað svo hægt sé að bera kennsl á leak
 * óháð tungumáli.
 */
function stripPromptLeak(text: string, prompt: string): string {
  const promptStart = prompt.split('\n')[0]
  if (text.includes(promptStart)) {
    for (const line of prompt.split('\n')) {
      const trimmed = line.trim()
      if (trimmed) text = text.replace(trimmed, '')
    }
    text = text.replace(/\n{3,}/g, '\n\n').trim()
  }
  return text
}

/**
 * Whisper/transcribe hallucinate endurtekinn texta þegar þögn er í hljóðskrá.
 * Þetta finnur og klippir burt endurtekningar í lok textans:
 * - Endurtekin orð (4+ sinnum): "Kennedy Kennedy Kennedy Kennedy..."
 * - Endurteknar setningar (3+ sinnum): "Það er ekki áhengið. Það er ekki áhengið. Það er ekki áhengið..."
 * - Stök stafir (6+ sinnum): "a a a a a a a..."
 */
function stripHallucination(text: string): string {
  // ── 1. Endurteknar setningar/frasa (n-gram) ──────────
  // Leita frá enda textans eftir endurteknum frösum (2-12 orð)
  const words = text.split(/\s+/)
  if (words.length >= 10) {
    for (let phraseLen = 2; phraseLen <= 12; phraseLen++) {
      // Byrja á aftasta mögulega frasa
      if (words.length < phraseLen * 3) continue
      const lastPhrase = words.slice(-phraseLen).join(' ').toLowerCase()
      let repeatCount = 0
      // Telja hversu oft þessi frasi endurtekist aftur á bak
      for (let pos = words.length - phraseLen; pos >= 0; pos -= phraseLen) {
        const candidate = words.slice(pos, pos + phraseLen).join(' ').toLowerCase()
        if (candidate === lastPhrase) repeatCount++
        else break
      }
      if (repeatCount >= 3) {
        // Klippa frá fyrstu endurtekningu (halda einni)
        const cutAt = words.length - (repeatCount * phraseLen) + phraseLen
        return words.slice(0, cutAt).join(' ').trim()
      }
    }
  }

  // ── 2. Endurtekin stök orð (4+ sinnum) ─────────────
  if (words.length >= 10) {
    for (let i = words.length - 1; i >= 4; i--) {
      const word = words[i].toLowerCase()
      let repeatCount = 0
      for (let j = i; j >= 0; j--) {
        if (words[j].toLowerCase() === word) repeatCount++
        else break
      }
      if (repeatCount >= 4) {
        const cutAt = i - repeatCount + 1
        let scanBack = cutAt
        while (scanBack > 0) {
          const w = words[scanBack - 1].toLowerCase()
          let count = 0
          for (let k = scanBack - 1; k >= 0; k--) {
            if (words[k].toLowerCase() === w) count++
            else break
          }
          if (count >= 3) {
            scanBack -= count
          } else {
            break
          }
        }
        return words.slice(0, scanBack).join(' ').trim()
      }
    }
  }

  // ── 3. Stök stafir endurteknir (6+ sinnum) ────────
  if (words.length >= 10) {
    const tail = words.slice(-20).join(' ')
    if (/\b(\w)\s+(\1\s+){5,}/.test(tail)) {
      for (let i = words.length - 20; i < words.length; i++) {
        if (i < 0) continue
        if (words[i].length <= 2) {
          const w = words[i].toLowerCase()
          let count = 0
          for (let j = i; j < words.length; j++) {
            if (words[j].toLowerCase() === w) count++
            else break
          }
          if (count >= 6) return words.slice(0, i).join(' ').trim()
        }
      }
    }
  }

  return text
}

export async function transcribeAudio(audioBlob: Blob, filename = 'hljod.webm', locale: Locale = 'is'): Promise<string> {
  const file = new File([audioBlob], filename, { type: audioBlob.type || 'audio/webm' })
  const language = LANGUAGE_MAP[locale] || 'is'
  const prompt = PROMPT_MAP[locale] || ISLENSKA_PROMPT

  try {
    const result = await withRetry(() =>
      openai.audio.transcriptions.create({
        file,
        model: PRIMARY_MODEL,
        language,
        prompt,
      })
    )
    return stripHallucination(stripPromptLeak(result.text.trim(), prompt))
  } catch (error) {
    // Fall back to whisper-1 for files exceeding gpt-4o-transcribe's 1400s limit
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('longer than') || msg.includes('maximum')) {
      const result = await withRetry(() =>
        openai.audio.transcriptions.create({
          file,
          model: FALLBACK_MODEL,
          language,
          prompt,
        })
      )
      return stripHallucination(stripPromptLeak(result.text.trim(), prompt))
    }
    throw error
  }
}

export async function transcribeBuffer(buffer: Buffer, filename = 'hljod.webm', locale: Locale = 'is'): Promise<string> {
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
  const blob = new Blob([ab], { type: 'audio/webm' })
  return transcribeAudio(blob, filename, locale)
}
