'use client'

import { useEffect } from 'react'
import type { Paddle } from '@paddle/paddle-js'

let paddleInstance: Paddle | null = null
let paddlePromise: Promise<Paddle | undefined> | null = null

type PaddleEventHandler = (event: { name?: string }) => void
const eventListeners = new Set<PaddleEventHandler>()

export function onPaddleEvent(handler: PaddleEventHandler) {
  eventListeners.add(handler)
  return () => { eventListeners.delete(handler) }
}

function loadScript(): Promise<Paddle> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') { reject(new Error('SSR')); return }
    if (window.Paddle) { resolve(window.Paddle); return }

    const existing = document.querySelector('script[src*="paddle.com/paddle"]')
    if (existing) {
      existing.addEventListener('load', () => {
        window.Paddle ? resolve(window.Paddle) : reject(new Error('Paddle not on window'))
      })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://cdn.paddle.com/paddle/v2/paddle.js'
    script.async = true
    script.onload = () => {
      window.Paddle ? resolve(window.Paddle) : reject(new Error('Paddle not on window'))
    }
    script.onerror = () => reject(new Error('Failed to load Paddle CDN script'))
    document.head.appendChild(script)
  })
}

export async function getPaddle(): Promise<Paddle | undefined> {
  if (paddleInstance) return paddleInstance

  if (!paddlePromise) {
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN
    if (!token) return undefined

    paddlePromise = (async () => {
      const paddle = await loadScript()

      paddle.Environment.set(
        (process.env.NEXT_PUBLIC_PADDLE_ENV as 'sandbox' | 'production') || 'sandbox'
      )

      if (!paddle.Initialized) {
        try {
          paddle.Initialize({
            token,
            eventCallback: (event) => {
              eventListeners.forEach(fn => fn(event))
            },
          })
        } catch (initErr) {
          // ProfitWell/Retain may crash but checkout config might still be set
          console.warn('[Paddle] Initialize threw (ProfitWell?), continuing anyway:', initErr)
        }
      }

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
