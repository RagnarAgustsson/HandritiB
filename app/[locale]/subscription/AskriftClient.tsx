'use client'

import { useState, useEffect, useRef } from 'react'
import { useUser } from '@clerk/nextjs'
import { Loader2, CreditCard, Clock, Zap, CheckCircle, AlertCircle } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import { formatDate } from '@/i18n/config'
import { getPaddle } from '@/app/components/PaddleLoader'
import type { Paddle } from '@paddle/paddle-js'

interface SubscriptionData {
  status: string
  planId: string | null
  currentPeriodEnd: string | null
  trialEndsAt: string | null
  canceledAt: string | null
  minutesLimit: number
  paddleSubscriptionId: string | null
}

interface UsageData {
  usedMinutes: number
  limitMinutes: number
  remainingMinutes: number
  percentUsed: number
}

interface AskriftResponse {
  subscription: SubscriptionData
  usage: UsageData
  isAdmin: boolean
  hasFreeAccess: boolean
}

const STATUS_COLORS: Record<string, string> = {
  trialing: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  active: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  past_due: 'text-red-400 bg-red-500/10 border-red-500/20',
  canceled: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
  paused: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/20',
}

export default function AskriftClient() {
  const { user } = useUser()
  const locale = useLocale()
  const t = useTranslations('subscription')
  const tc = useTranslations('common')
  const [data, setData] = useState<AskriftResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [checkoutError, setCheckoutError] = useState('')
  const paddleRef = useRef<Paddle | null>(null)

  useEffect(() => {
    fetch('/api/askrift')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))

    // Pre-load Paddle so it's ready on click (avoids popup blocker)
    getPaddle().then(p => { if (p) paddleRef.current = p })
  }, [])

  function openCheckout() {
    setCheckoutError('')
    const priceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID
    if (!priceId) { setCheckoutError(t('priceError')); return }
    if (!user) { setCheckoutError(t('userNotLoaded')); return }

    const paddle = paddleRef.current
    if (!paddle) { setCheckoutError(t('paymentUnavailable')); return }

    try {
      paddle.Checkout.open({
        items: [{ priceId, quantity: 1 }],
        customData: { userId: user.id },
        customer: { email: user.emailAddresses[0]?.emailAddress || '' },
        settings: {
          theme: 'dark',
          displayMode: 'overlay',
          successUrl: `${window.location.origin}/subscription?success=true`,
        },
      })
    } catch {
      setCheckoutError(t('paymentNotReady'))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950">
        <div className="mx-auto max-w-2xl px-4 py-10">
          <div className="flex items-center gap-3 text-zinc-400 py-12 justify-center">
            <Loader2 className="h-5 w-5 animate-spin" />
            {tc('loading')}
          </div>
        </div>
      </div>
    )
  }

  if (!data) return null

  const { subscription: sub, usage, isAdmin, hasFreeAccess } = data
  const statusColor = STATUS_COLORS[sub.status] || STATUS_COLORS.active
  const statusLabel = t(`statusLabels.${sub.status}` as any)
  const pct = Math.min(usage.percentUsed, 100)
  const isBlocked = pct >= 100
  const hasSearchParam = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('success')

  return (
    <div className="min-h-screen bg-zinc-950">
      <div className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-2xl font-bold text-zinc-100 mb-8">{t('title')}</h1>

        {hasSearchParam && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 mb-6 text-sm text-emerald-400">
            <CheckCircle className="h-4 w-4 shrink-0" />
            {t('activated')}
          </div>
        )}

        <div className="space-y-4">
          {/* Staða */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <CreditCard className="h-5 w-5 text-zinc-400" />
                <span className="font-semibold text-zinc-100">{t('status')}</span>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-medium border ${statusColor}`}>
                {statusLabel}
              </span>
            </div>

            {(hasFreeAccess || isAdmin) && (
              <div className="flex items-center gap-2 text-sm text-emerald-400 mb-3">
                <Zap className="h-4 w-4" />
                {isAdmin ? t('adminAccess') : t('freeAccess')}
              </div>
            )}

            {sub.trialEndsAt && sub.status === 'trialing' && (
              <p className="text-sm text-zinc-400">
                {t('trialExpires', { date: formatDate(new Date(sub.trialEndsAt)) })}
              </p>
            )}

            {sub.currentPeriodEnd && sub.status === 'active' && (
              <p className="text-sm text-zinc-400">
                {t('nextRenewal', { date: formatDate(new Date(sub.currentPeriodEnd)) })}
              </p>
            )}

            {sub.canceledAt && (
              <p className="text-sm text-zinc-500">
                {t('canceledAt', { date: formatDate(new Date(sub.canceledAt)) })}
              </p>
            )}
          </div>

          {/* Notkun */}
          {!hasFreeAccess && !isAdmin && (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-5">
              <div className="flex items-center gap-3 mb-4">
                <Clock className="h-5 w-5 text-zinc-400" />
                <span className="font-semibold text-zinc-100">{t('usage')}</span>
              </div>

              <div className="flex justify-between text-sm mb-2">
                <span className="text-zinc-400">{t('minutesUsed')}</span>
                <span className={isBlocked ? 'text-red-400 font-medium' : 'text-zinc-300'}>
                  {usage.usedMinutes} / {usage.limitMinutes} {tc('min')}
                </span>
              </div>

              <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isBlocked ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-indigo-500'
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>

              {isBlocked && (
                <div className="flex items-center gap-2 text-sm text-red-400 mt-3">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {t('minutesExhausted')}
                </div>
              )}
            </div>
          )}

          {/* Aðgerðir */}
          {checkoutError && (
            <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-4 text-sm text-red-400">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {checkoutError}
            </div>
          )}
          <div className="flex flex-col gap-3 pt-2">
            {(sub.status === 'trialing' || sub.status === 'canceled' || !sub.paddleSubscriptionId) && (
              <button
                onClick={openCheckout}
                className="flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-6 py-3 text-white font-semibold hover:bg-indigo-600 transition"
              >
                <CreditCard className="h-5 w-5" />
                {sub.status === 'canceled' ? t('renew') : t('upgrade')}
              </button>
            )}

            {sub.paddleSubscriptionId && sub.status === 'active' && (
              <p className="text-sm text-zinc-500 text-center">
                {t('manageNote')}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
