import { transcribeAudio } from './transcribe'
import { generateNotes } from './summarize'
import { createChunk, createNote, getSessionChunks, updateSession } from '@/lib/db/sessions'
import type { PromptProfile } from './prompts'
import type { Locale } from '@/i18n/config'

interface ProcessChunkInput {
  sessionId: string | null
  seq: number
  audioBlob: Blob
  profile: PromptProfile
  durationSeconds?: number
  filename?: string
  ephemeral?: boolean
  previousTranscripts?: string[]
  locale?: Locale
}

interface ProcessChunkResult {
  transcript: string
  notes: string
  rollingSummary: string
  chunkId: string
}

export async function processChunk(input: ProcessChunkInput): Promise<ProcessChunkResult> {
  const { sessionId, seq, audioBlob, profile, durationSeconds = 0, filename, ephemeral = false, previousTranscripts: suppliedContext, locale = 'is' } = input

  // 1. Transcribe
  const transcript = await transcribeAudio(audioBlob, filename, locale)
  if (!transcript) return { transcript: '', notes: '', rollingSummary: '', chunkId: '' }

  let chunkId = ''
  let previousTranscripts: string[]

  if (ephemeral || !sessionId) {
    previousTranscripts = suppliedContext || []
  } else {
    const chunk = await createChunk({ sessionId, seq, transcript, durationSeconds })
    chunkId = chunk.id

    const previousChunks = await getSessionChunks(sessionId)
    previousTranscripts = previousChunks
      .filter(c => c.id !== chunkId)
      .map(c => c.transcript)
  }

  // Generate notes
  const { notes, rollingSummary } = await generateNotes(transcript, profile, previousTranscripts, locale)

  if (!ephemeral && sessionId) {
    await createNote({ sessionId, chunkId: chunkId || undefined, content: notes, rollingSummary })

    const allChunks = await getSessionChunks(sessionId)
    const totalSeconds = allChunks.reduce((sum, c) => sum + c.durationSeconds, 0)
    await updateSession(sessionId, { totalSeconds, updatedAt: new Date() })
  }

  return { transcript, notes, rollingSummary, chunkId }
}
