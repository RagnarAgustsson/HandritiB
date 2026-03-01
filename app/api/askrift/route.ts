import { auth } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'
import { getSubscription, createTrialSubscription } from '@/lib/db/subscriptions'
import { getUserUsageSummary } from '@/lib/db/usage'
import { hasFreeAccess } from '@/lib/db/free-access'
import { isAdmin } from '@/lib/db/admin'

export async function GET() {
  const { userId } = await auth()
  if (!userId) return NextResponse.json({ villa: 'Ekki innskráður' }, { status: 401 })

  const [admin, freeAccess] = await Promise.all([
    isAdmin(userId),
    hasFreeAccess(userId),
  ])

  let sub = await getSubscription(userId)
  if (!sub) sub = await createTrialSubscription(userId)

  const usage = await getUserUsageSummary(userId)

  return NextResponse.json({
    subscription: {
      status: sub.status,
      planId: sub.planId,
      currentPeriodStart: sub.currentPeriodStart,
      currentPeriodEnd: sub.currentPeriodEnd,
      trialEndsAt: sub.trialEndsAt,
      canceledAt: sub.canceledAt,
      minutesLimit: sub.minutesLimit,
      paddleSubscriptionId: sub.paddleSubscriptionId,
    },
    usage: {
      usedMinutes: Math.round(usage.usedSeconds / 60),
      limitMinutes: Math.round(usage.limitSeconds / 60),
      remainingMinutes: Math.round(usage.remainingSeconds / 60),
      percentUsed: Math.round(usage.percentUsed),
    },
    isAdmin: admin,
    hasFreeAccess: freeAccess,
  })
}
