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
 * Whisper/transcribe hallucinate endurtekinn texta þegar þögn er í hljóðskrá.
 * Þetta finnur og klippir burt endurtekningar í lok textans.
 */
function stripHallucination(text: string): string {
  const words = text.split(/\s+/)
  if (words.length < 10) return text

  // Finna þar sem sama orð/orðasamband endurtekist 4+ sinnum í röð
  for (let i = words.length - 1; i >= 4; i--) {
    const word = words[i].toLowerCase()
    let repeatCount = 0
    for (let j = i; j >= 0; j--) {
      if (words[j].toLowerCase() === word) repeatCount++
      else break
    }
    if (repeatCount >= 4) {
      // Klippa allt frá fyrstu endurtekningu til enda
      const cutAt = i - repeatCount + 1
      // Leita aftur á bak eftir fleiri endurteknum orðum (keðjur eins og "Kennedy Kennedy Kazanjani Kazanjani")
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

  // Finna "a a a a" mynstur (stök stafir endurteknir)
  const tail = words.slice(-20).join(' ')
  if (/\b(\w)\s+(\1\s+){5,}/.test(tail)) {
    // Klippa frá þar sem einstafs-endurtekningar byrja
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
    return stripHallucination(result.text.trim())
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
      return stripHallucination(result.text.trim())
    }
    throw error
  }
}

export async function transcribeBuffer(buffer: Buffer, filename = 'hljod.webm'): Promise<string> {
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
  const blob = new Blob([ab], { type: 'audio/webm' })
  return transcribeAudio(blob, filename)
}
