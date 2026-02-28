import { openai } from '@/lib/openai/client'

const TRANSCRIPTION_MODEL = 'whisper-1'

export async function transcribeAudio(audioBlob: Blob, filename = 'hljod.webm'): Promise<string> {
  const file = new File([audioBlob], filename, { type: audioBlob.type || 'audio/webm' })

  const result = await openai.audio.transcriptions.create({
    file,
    model: TRANSCRIPTION_MODEL,
    language: 'is',
    prompt: 'Íslenska hljóðritun. Notaðu rétta stafsetningu og greinarmerk.',
  })

  return result.text.trim()
}

export async function transcribeBuffer(buffer: Buffer, filename = 'hljod.webm'): Promise<string> {
  const ab = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer
  const blob = new Blob([ab], { type: 'audio/webm' })
  return transcribeAudio(blob, filename)
}
