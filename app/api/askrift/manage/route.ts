import { auth } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'
import { paddle } from '@/lib/paddle/client'
import { getSubscription } from '@/lib/db/subscriptions'
import { logAction } from '@/lib/db/admin'

export async function POST(request: NextRequest) {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ error: 'Ekki innskráður' }, { status: 401 })

  const { action, priceId } = await request.json()

  const sub = await getSubscription(userId)
  if (!sub?.paddleSubscriptionId) {
    return NextResponse.json({ error: 'Engin virk áskrift' }, { status: 400 })
  }

  try {
    switch (action) {
      case 'update': {
        if (!priceId) return NextResponse.json({ error: 'priceId vantar' }, { status: 400 })
        await paddle.subscriptions.update(sub.paddleSubscriptionId, {
          items: [{ priceId, quantity: 1 }],
          prorationBillingMode: 'prorated_immediately',
        })
        await logAction(userId, '', 'askrift.uppfaera', `Nýtt verð: ${priceId}`)
        return NextResponse.json({ ok: true })
      }

      case 'cancel': {
        await paddle.subscriptions.cancel(sub.paddleSubscriptionId, {
          effectiveFrom: 'next_billing_period',
        })
        await logAction(userId, '', 'askrift.segjaupp', `Paddle: ${sub.paddleSubscriptionId}`)
        return NextResponse.json({ ok: true })
      }

      default:
        return NextResponse.json({ error: 'Ógild aðgerð' }, { status: 400 })
    }
  } catch (err: any) {
    console.error('[Paddle] manage error:', err)
    return NextResponse.json({ error: 'Villa við að uppfæra áskrift' }, { status: 500 })
  }
}
