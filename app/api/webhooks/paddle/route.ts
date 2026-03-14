import { NextRequest, NextResponse } from 'next/server'
import { paddle } from '@/lib/paddle/client'
import { upsertSubscription, updateSubscriptionByPaddleId } from '@/lib/db/subscriptions'
import { logAction } from '@/lib/db/admin'
import type { EventEntity } from '@paddle/paddle-node-sdk'

const PRICE_MINUTES: Record<string, number> = {
  [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID?.trim() || '']: 300,
  [process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_PRO?.trim() || '']: 1000,
}

function getMinutesForPrice(priceId: string | undefined): number {
  if (!priceId) return 300
  return PRICE_MINUTES[priceId] || 300
}

export async function POST(request: NextRequest) {
  const signature = request.headers.get('paddle-signature') || ''
  const rawBody = await request.text()

  let event: EventEntity
  try {
    event = await paddle.webhooks.unmarshal(
      rawBody,
      process.env.PADDLE_WEBHOOK_SECRET!,
      signature
    )
  } catch (err) {
    console.error('Paddle webhook staðfesting mistókst:', err)
    return NextResponse.json({ villa: 'Ógild undirskrift' }, { status: 400 })
  }

  const data = event.data as any

  try {
    switch (event.eventType) {
      case 'subscription.created': {
        const sub = data
        const userId = sub.customData?.userId as string | undefined
        if (!userId) {
          console.error('Paddle subscription.created: userId vantar í customData')
          break
        }

        await upsertSubscription({
          userId,
          paddleSubscriptionId: sub.id,
          paddleCustomerId: sub.customerId,
          status: sub.status === 'trialing' ? 'trialing' : 'active',
          planId: sub.items?.[0]?.price?.id || null,
          currentPeriodStart: sub.currentBillingPeriod?.startsAt ? new Date(sub.currentBillingPeriod.startsAt) : new Date(),
          currentPeriodEnd: sub.currentBillingPeriod?.endsAt ? new Date(sub.currentBillingPeriod.endsAt) : null,
          trialEndsAt: sub.currentBillingPeriod?.startsAt && sub.status === 'trialing'
            ? new Date(sub.currentBillingPeriod.endsAt)
            : null,
          minutesLimit: getMinutesForPrice(sub.items?.[0]?.price?.id),
        })
        await logAction(userId, '', 'askrift.stofna', `Paddle: ${sub.id}`)
        break
      }

      case 'subscription.updated': {
        const sub = data
        const priceId = sub.items?.[0]?.price?.id
        await updateSubscriptionByPaddleId(sub.id, {
          status: mapPaddleStatus(sub.status),
          planId: priceId || undefined,
          minutesLimit: getMinutesForPrice(priceId),
          currentPeriodStart: sub.currentBillingPeriod?.startsAt ? new Date(sub.currentBillingPeriod.startsAt) : undefined,
          currentPeriodEnd: sub.currentBillingPeriod?.endsAt ? new Date(sub.currentBillingPeriod.endsAt) : undefined,
          canceledAt: sub.canceledAt ? new Date(sub.canceledAt) : undefined,
        })
        break
      }

      case 'subscription.canceled': {
        const sub = data
        await updateSubscriptionByPaddleId(sub.id, {
          status: 'canceled',
          canceledAt: new Date(),
        })
        break
      }

      case 'transaction.payment_failed': {
        const txn = data
        if (txn.subscriptionId) {
          await updateSubscriptionByPaddleId(txn.subscriptionId, { status: 'past_due' })
        }
        break
      }
    }
  } catch (err) {
    console.error('Paddle webhook villa:', err)
    // Skila 200 svo Paddle reyni ekki aftur
  }

  return NextResponse.json({ ok: true })
}

function mapPaddleStatus(status: string): 'trialing' | 'active' | 'past_due' | 'canceled' | 'paused' {
  switch (status) {
    case 'trialing': return 'trialing'
    case 'active': return 'active'
    case 'past_due': return 'past_due'
    case 'canceled': return 'canceled'
    case 'paused': return 'paused'
    default: return 'active'
  }
}
