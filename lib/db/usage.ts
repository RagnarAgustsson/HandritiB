import { eq, and, gte, sql, inArray } from 'drizzle-orm'
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
  // Dedup: if sessionId is provided, skip if already recorded for this session+source
  if (params.sessionId) {
    const existing = await db
      .select({ id: usageRecords.id })
      .from(usageRecords)
      .where(
        and(
          eq(usageRecords.sessionId, params.sessionId),
          eq(usageRecords.source, params.source)
        )
      )
      .limit(1)
    if (existing.length > 0) return
  }

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

/**
 * Batch usage query — single GROUP BY instead of N+1.
 * Returns Map<userId, usedSeconds>.
 */
export async function getUsageForAllUsers(
  userPeriods: { userId: string; periodStart: Date }[]
): Promise<Map<string, number>> {
  if (userPeriods.length === 0) return new Map()

  // Find the earliest periodStart to use as a floor filter
  const earliest = userPeriods.reduce(
    (min, p) => (p.periodStart < min ? p.periodStart : min),
    userPeriods[0].periodStart
  )

  const userIds = userPeriods.map(p => p.userId)
  const rows = await db
    .select({
      userId: usageRecords.userId,
      total: sql<number>`COALESCE(SUM(${usageRecords.seconds}), 0)`,
    })
    .from(usageRecords)
    .where(
      and(
        inArray(usageRecords.userId, userIds),
        gte(usageRecords.periodStart, earliest)
      )
    )
    .groupBy(usageRecords.userId)

  const result = new Map<string, number>()
  for (const row of rows) {
    result.set(row.userId, Number(row.total))
  }
  return result
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
