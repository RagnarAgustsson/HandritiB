'use client'

import { useEffect } from 'react'
import { initializePaddle, type Paddle } from '@paddle/paddle-js'

let paddleInstance: Paddle | null = null
let paddlePromise: Promise<Paddle | undefined> | null = null

export async function getPaddle(): Promise<Paddle | undefined> {
  if (paddleInstance) return paddleInstance

  if (!paddlePromise) {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
    if (!token) return undefined

    paddlePromise = initializePaddle({
      token,
      environment: (process.env.NEXT_PUBLIC_PADDLE_ENV as 'sandbox' | 'production') || 'sandbox',
    })
  }

  const instance = await paddlePromise
  if (instance) paddleInstance = instance
  return instance
}

export default function PaddleLoader() {
  useEffect(() => {
    getPaddle()
  }, [])

  return null
}
