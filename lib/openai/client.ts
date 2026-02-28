import OpenAI from 'openai'

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) throw new Error('OPENAI_API_KEY vantar í umhverfisbreytur')
  return new OpenAI({ apiKey })
}

export const openai = getClient()
