import { transcribeAudio } from './transcribe'
import { generateNotes } from './summarize'
import { createChunk, createNote, getSessionChunks, updateSession } from '@/lib/db/sessions'
import type { PromptProfile } from './prompts'

interface ProcessChunkInput {
  sessionId: string
  seq: number
  audioBlob: Blob
  profile: PromptProfile
  durationSeconds?: number
  filename?: string
}

interface ProcessChunkResult {
  transcript: string
  notes: string
  rollingSummary: string
  chunkId: string
}

export async function processChunk(input: ProcessChunkInput): Promise<ProcessChunkResult> {
  const { sessionId, seq, audioBlob, profile, durationSeconds = 0, filename } = input

  // 1. Transcribe
  const transcript = await transcribeAudio(audioBlob, filename)
  if (!transcript) return { transcript: '', notes: '', rollingSummary: '', chunkId: '' }

  // 2. Save chunk
  const chunk = await createChunk({ sessionId, seq, transcript, durationSeconds })

  // 3. Get previous transcripts for context
  const previousChunks = await getSessionChunks(sessionId)
  const previousTranscripts = previousChunks
    .filter(c => c.id !== chunk.id)
    .map(c => c.transcript)

  // 4. Generate notes
  const { notes, rollingSummary } = await generateNotes(transcript, profile, previousTranscripts)

  // 5. Save note
  await createNote({ sessionId, chunkId: chunk.id, content: notes, rollingSummary })

  // 6. Update session total time
  await updateSession(sessionId, {
    updatedAt: new Date(),
  })

  return { transcript, notes, rollingSummary, chunkId: chunk.id }
}
