import { openai } from '@/lib/openai/client'
import {
  buildNotesSystemPrompt,
  buildFinalSummarySystemPrompt,
  buildContextBlock,
  sanitizeTranscriptParts,
  type PromptProfile,
} from './prompts'

const CHAT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o'

interface NotesRaw {
  notes: string[] | string
  rollingSummary: string
}

interface NotesResult {
  notes: string
  rollingSummary: string
}

export async function generateNotes(
  transcript: string,
  profile: PromptProfile,
  previousTranscripts: string[]
): Promise<NotesResult> {
  const systemPrompt = buildNotesSystemPrompt(profile)

  // Byggja user message: fyrra samhengi + nýjasti hluti
  const context = buildContextBlock(previousTranscripts, 2)
  const parts: string[] = []
  if (context) parts.push(context)
  parts.push(`=== NÝJASTI HLUTI ===\n${(transcript ?? '').trim()}`)
  const userMessage = parts.join('\n\n---\n\n')

  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('Engin svör frá AI')

  const parsed = JSON.parse(content) as NotesRaw
  const notes = Array.isArray(parsed.notes)
    ? parsed.notes.map(n => `• ${n}`).join('\n')
    : parsed.notes || ''
  return {
    notes,
    rollingSummary: parsed.rollingSummary || '',
  }
}

export async function generateFinalSummary(
  allTranscripts: string[],
  profile: PromptProfile
): Promise<string> {
  const systemPrompt = buildFinalSummarySystemPrompt(profile)

  // Gögnin fara í user message
  const cleanTranscripts = sanitizeTranscriptParts(allTranscripts)
  const userMessage = cleanTranscripts.join('\n\n')

  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    temperature: 0.4,
  })

  return response.choices[0]?.message?.content?.trim() || ''
}
