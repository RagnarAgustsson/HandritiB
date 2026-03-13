'use client'

import { useEffect } from 'react'
import { initializePaddle, type Paddle } from '@paddle/paddle-js'

let paddleInstance: Paddle | null = null
let paddlePromise: Promise<Paddle | undefined> | null = null

type PaddleEventHandler = (event: { name?: string }) => void
const eventListeners = new Set<PaddleEventHandler>()

export function onPaddleEvent(handler: PaddleEventHandler) {
  eventListeners.add(handler)
  return () => { eventListeners.delete(handler) }
}

export async function getPaddle(): Promise<Paddle | undefined> {
  if (paddleInstance) return paddleInstance

  if (!paddlePromise) {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
    if (!token) return undefined

    paddlePromise = initializePaddle({
      token,
      environment: (process.env.NEXT_PUBLIC_PADDLE_ENV as 'sandbox' | 'production') || 'sandbox',
      eventCallback: (event) => {
        eventListeners.forEach(fn => fn(event))
      },
    })
  }

  try {
    const instance = await paddlePromise
    if (instance) paddleInstance = instance
    return instance
  } catch (err) {
    // Reset so next call retries instead of returning cached rejection
    paddlePromise = null
    console.error('[Paddle] init failed:', err)
    return undefined
  }
}

export default function PaddleLoader() {
  useEffect(() => {
    getPaddle()
  }, [])

  return null
}
