import { openai } from '@/lib/openai/client'

// gpt-4o-transcribe er mun betri en whisper-1 fyrir íslensku —
// skilur samhengi, leiðréttir sjálfkrafa og þekkir fleiri orð.
const TRANSCRIPTION_MODEL = process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-transcribe'

// Íslenski fyrirmælastrengurinn gefur líkaninu vísbendingar um
// hvernig það á að túlka talið — mikilvægt fyrir séríslenskar orðmyndir.
const ISLENSKA_PROMPT = `Þetta er íslenskt tal. Skráðu nákvæmlega það sem sagt er á vandaðri íslensku.
Notaðu rétta stafsetningu, greinarmerk og fallbeygingu.
Leiðréttu talmálsvillur en breyttu ekki merkingu eða orðavali.
Íslenskar orðmyndir: þ, ð, æ, ö, á, é, í, ó, ú, ý.`

export async function transcribeAudio(audioBlob: Blob, filename = 'hljod.webm'): Promise<string> {
  const file = new File([audioBlob], filename, { type: audioBlob.type || 'audio/webm' })

  const result = await openai.audio.transcriptions.create({
    file,
    model: TRANSCRIPTION_MODEL,
    language: 'is',
    prompt: ISLENSKA_PROMPT,
  })

  return result.text.trim()
}

export async function transcribeBuffer(buffer: Buffer, filename = 'hljod.webm'): Promise<string> {
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
  const blob = new Blob([ab], { type: 'audio/webm' })
  return transcribeAudio(blob, filename)
}
