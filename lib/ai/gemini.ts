import { GoogleGenerativeAI } from '@google/generative-ai'

let _client: GoogleGenerativeAI | null = null

export function getGeminiClient(): GoogleGenerativeAI {
  if (_client) return _client
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) throw new Error('GEMINI_API_KEY vantar í umhverfisbreytur')
  _client = new GoogleGenerativeAI(apiKey)
  return _client
}

// Lazy — krassar ekki nema Gemini sé raunverulega notað
export const gemini = new Proxy({} as GoogleGenerativeAI, {
  get(_, prop) {
    return (getGeminiClient() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
