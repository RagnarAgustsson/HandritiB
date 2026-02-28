import { openai } from '@/lib/openai/client'
import { buildNotesPrompt, buildFinalSummaryPrompt, type PromptProfile } from './prompts'

const CHAT_MODEL = process.env.OPENAI_MODEL || 'gpt-4o'

interface NotesResult {
  notes: string
  rollingSummary: string
}

export async function generateNotes(
  transcript: string,
  profile: PromptProfile,
  previousTranscripts: string[]
): Promise<NotesResult> {
  const systemPrompt = buildNotesPrompt(profile, previousTranscripts)

  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: transcript },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
  })

  const content = response.choices[0]?.message?.content
  if (!content) throw new Error('Engin svör frá AI')

  const parsed = JSON.parse(content) as NotesResult
  return {
    notes: parsed.notes || '',
    rollingSummary: parsed.rollingSummary || '',
  }
}

export async function generateFinalSummary(
  allTranscripts: string[],
  profile: PromptProfile
): Promise<string> {
  const systemPrompt = buildFinalSummaryPrompt(profile, allTranscripts)

  const response = await openai.chat.completions.create({
    model: CHAT_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: 'Skrifaðu lokasamantektina.' },
    ],
    temperature: 0.4,
  })

  return response.choices[0]?.message?.content?.trim() || ''
}
