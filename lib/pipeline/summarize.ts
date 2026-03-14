import { openai } from '@/lib/openai/client'
import { gemini } from '@/lib/ai/gemini'
import { aiConfig } from '@/lib/ai/config'
import {
  buildNotesSystemPrompt,
  buildFinalSummarySystemPrompt,
  buildContextBlock,
  sanitizeTranscriptParts,
  type PromptProfile,
} from './prompts'
import type { Locale } from '@/i18n/config'

// ── Unified chat interface ──────────────────────────────────────────

interface ChatRequest {
  systemPrompt: string
  userMessage: string
  temperature: number
  json?: boolean
}

async function chatOpenAI(req: ChatRequest): Promise<string> {
  const response = await openai.chat.completions.create({
    model: aiConfig.model,
    store: false,
    messages: [
      { role: 'system', content: req.systemPrompt },
      { role: 'user', content: req.userMessage },
    ],
    ...(req.json && { response_format: { type: 'json_object' as const } }),
    temperature: req.temperature,
  })
  return response.choices[0]?.message?.content || ''
}

async function chatGemini(req: ChatRequest): Promise<string> {
  const model = gemini.getGenerativeModel({
    model: aiConfig.model,
    systemInstruction: req.systemPrompt,
    generationConfig: {
      temperature: req.temperature,
      ...(req.json && { responseMimeType: 'application/json' }),
    },
  })
  const result = await model.generateContent(req.userMessage)
  return result.response.text()
}

async function chat(req: ChatRequest): Promise<string> {
  if (aiConfig.provider === 'gemini') return chatGemini(req)
  return chatOpenAI(req)
}

// ── Notes ───────────────────────────────────────────────────────────

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
  previousTranscripts: string[],
  locale: Locale = 'is',
  userContext?: string
): Promise<NotesResult> {
  const systemPrompt = buildNotesSystemPrompt(profile, locale, userContext)

  const sectionMarker: Record<Locale, string> = {
    is: '=== NÝJASTI HLUTI ===',
    nb: '=== NYESTE DEL ===',
    da: '=== NYESTE DEL ===',
    sv: '=== SENASTE DELEN ===',
  }

  const context = buildContextBlock(previousTranscripts, 2)
  const parts: string[] = []
  if (context) parts.push(context)
  parts.push(`${sectionMarker[locale] || sectionMarker.is}\n${(transcript ?? '').trim()}`)
  const userMessage = parts.join('\n\n---\n\n')

  const content = await chat({
    systemPrompt,
    userMessage,
    temperature: aiConfig.temperature.notes,
    json: true,
  })

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

// ── Final summary ───────────────────────────────────────────────────

export async function generateFinalSummary(
  allTranscripts: string[],
  profile: PromptProfile,
  locale: Locale = 'is',
  userContext?: string
): Promise<string> {
  const systemPrompt = buildFinalSummarySystemPrompt(profile, locale, userContext)
  const cleanTranscripts = sanitizeTranscriptParts(allTranscripts)
  const userMessage = cleanTranscripts.join('\n\n')

  const content = await chat({
    systemPrompt,
    userMessage,
    temperature: aiConfig.temperature.summary,
  })

  return content.trim()
}
