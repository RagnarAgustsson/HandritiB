// Stillingarskrá fyrir AI módel.
//
// Env var:
//   AI_PROVIDER=openai   (default)
//   AI_PROVIDER=gemini
//
// Þetta stýrir hvaða módel er notað fyrir yfirferð og samantekt.
// Transcription er alltaf OpenAI (gpt-4o-transcribe / whisper-1).

export type AIProvider = 'openai' | 'gemini'

export interface AIConfig {
  provider: AIProvider
  model: string
  temperature: { notes: number; summary: number }
}

function resolveConfig(): AIConfig {
  const provider = (process.env.AI_PROVIDER || 'openai') as AIProvider

  if (provider === 'gemini') {
    return {
      provider: 'gemini',
      model: process.env.GEMINI_MODEL || 'gemini-2.5-pro',
      temperature: { notes: 0.3, summary: 0.4 },
    }
  }

  return {
    provider: 'openai',
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    temperature: { notes: 0.3, summary: 0.4 },
  }
}

export const aiConfig = resolveConfig()
