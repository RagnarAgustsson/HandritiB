import { Paddle, Environment } from '@paddle/paddle-node-sdk'

let _paddle: Paddle | null = null

export function getPaddle(): Paddle {
  if (_paddle) return _paddle

  const apiKey = process.env.PADDLE_API_KEY
  if (!apiKey) throw new Error('PADDLE_API_KEY vantar í umhverfisbreytur')

  _paddle = new Paddle(apiKey, {
    environment: process.env.NEXT_PUBLIC_PADDLE_ENV === 'production'
      ? Environment.production
      : Environment.sandbox,
  })

  return _paddle
}

// Lazy getter — won't throw at import time
export const paddle = new Proxy({} as Paddle, {
  get(_, prop) {
    return (getPaddle() as any)[prop]
  },
})
