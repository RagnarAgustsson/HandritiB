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

/**
 * Stub window.profitwell before Paddle CDN loads so that
 * Paddle.Initialize doesn't crash on ProfitWell/Retain setup.
 * Retain is half-enabled in the Paddle dashboard and causes
 * Q.defaults().profitwellSnippetBase to be undefined.
 */
function stubProfitWell() {
  if (typeof window === 'undefined') return
  if (!(window as any).profitwell) {
    (window as any).profitwell = function () { /* no-op stub */ }
  }
}

export async function getPaddle(): Promise<Paddle | undefined> {
  if (paddleInstance) return paddleInstance

  if (!paddlePromise) {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
    if (!token) return undefined

    paddlePromise = (async () => {
      stubProfitWell()

      const paddle = await initializePaddle({
        token,
        environment: (process.env.NEXT_PUBLIC_PADDLE_ENV as 'sandbox' | 'production') || 'sandbox',
        eventCallback: (event) => {
          eventListeners.forEach(fn => fn(event))
        },
      })

      return paddle
    })()
  }

  try {
    const instance = await paddlePromise
    if (instance) paddleInstance = instance
    return instance
  } catch (err) {
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
