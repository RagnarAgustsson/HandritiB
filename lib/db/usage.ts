import { eq, and, gte, sql } from 'drizzle-orm'
import { db } from './client'
import { usageRecords } from './schema'
import { getSubscription, createTrialSubscription } from './subscriptions'

export async function recordUsage(params: {
  userId: string
  sessionId: string | null
  seconds: number
  source: string
  periodStart: Date
}): Promise<void> {
  await db.insert(usageRecords).values({
    userId: params.userId,
    sessionId: params.sessionId,
    seconds: params.seconds,
    source: params.source,
    periodStart: params.periodStart,
  })
}

export async function getUsageForPeriod(userId: string, periodStart: Date): Promise<number> {
  const result = await db
    .select({ total: sql<number>`COALESCE(SUM(${usageRecords.seconds}), 0)` })
    .from(usageRecords)
    .where(
      and(
        eq(usageRecords.userId, userId),
        gte(usageRecords.periodStart, periodStart)
      )
    )
  return Number(result[0]?.total ?? 0)
}

export async function getUserUsageSummary(userId: string): Promise<{
  usedSeconds: number
  limitSeconds: number
  remainingSeconds: number
  percentUsed: number
}> {
  let sub = await getSubscription(userId)
  if (!sub) sub = await createTrialSubscription(userId)

  const periodStart = sub.currentPeriodStart || sub.createdAt
  const usedSeconds = await getUsageForPeriod(userId, periodStart)
  const limitSeconds = sub.minutesLimit * 60

  return {
    usedSeconds,
    limitSeconds,
    remainingSeconds: Math.max(0, limitSeconds - usedSeconds),
    percentUsed: limitSeconds > 0 ? Math.min(100, (usedSeconds / limitSeconds) * 100) : 0,
  }
}
