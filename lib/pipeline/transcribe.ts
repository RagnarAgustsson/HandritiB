import { openai } from '@/lib/openai/client'

// gpt-4o-transcribe er mun betri en whisper-1 fyrir íslensku —
// skilur samhengi, leiðréttir sjálfkrafa og þekkir fleiri orð.
// Hámarkslengd: 1400 sek. Ef lengra → fallback á whisper-1.
const PRIMARY_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-transcribe'
const FALLBACK_MODEL = 'whisper-1'

const ISLENSKA_PROMPT = `Þetta er íslenskt tal. Skráðu nákvæmlega það sem sagt er á vandaðri íslensku.
Notaðu rétta stafsetningu, greinarmerk og fallbeygingu.
Leiðréttu talmálsvillur en breyttu ekki merkingu eða orðavali.
Íslenskar orðmyndir: þ, ð, æ, ö, á, é, í, ó, ú, ý.`

/**
 * Fjarlægja ISLENSKA_PROMPT ef Whisper endurvarpar honum í úttakið.
 */
function stripPromptLeak(text: string): string {
  // Taka fyrstu 2 línur úr prompt til samanburðar (nóg til að bera kennsl á)
  const promptStart = ISLENSKA_PROMPT.split('\n')[0]
  if (text.includes(promptStart)) {
    // Fjarlægja allt sem líkist promptinu
    for (const line of ISLENSKA_PROMPT.split('\n')) {
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

export async function transcribeAudio(audioBlob: Blob, filename = 'hljod.webm'): Promise<string> {
  const file = new File([audioBlob], filename, { type: audioBlob.type || 'audio/webm' })

  try {
    const result = await openai.audio.transcriptions.create({
      file,
      model: PRIMARY_MODEL,
      language: 'is',
      prompt: ISLENSKA_PROMPT,
    })
    return stripHallucination(stripPromptLeak(result.text.trim()))
  } catch (error) {
    // Fall back to whisper-1 for files exceeding gpt-4o-transcribe's 1400s limit
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('longer than') || msg.includes('maximum')) {
      const result = await openai.audio.transcriptions.create({
        file,
        model: FALLBACK_MODEL,
        language: 'is',
        prompt: ISLENSKA_PROMPT,
      })
      return stripHallucination(stripPromptLeak(result.text.trim()))
    }
    throw error
  }
}

export async function transcribeBuffer(buffer: Buffer, filename = 'hljod.webm'): Promise<string> {
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
  const blob = new Blob([ab], { type: 'audio/webm' })
  return transcribeAudio(blob, filename)
}
