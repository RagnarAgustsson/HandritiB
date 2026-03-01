import { eq } from 'drizzle-orm'
import { db } from './client'
import { subscriptions, type Subscription, type NewSubscription } from './schema'

const TRIAL_DAYS = 7
const TRIAL_MINUTES = 60

export async function getSubscription(userId: string): Promise<Subscription | undefined> {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId))
    .limit(1)
  return rows[0]
}

export async function getSubscriptionByPaddleId(paddleSubId: string): Promise<Subscription | undefined> {
  const rows = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.paddleSubscriptionId, paddleSubId))
    .limit(1)
  return rows[0]
}

export async function createTrialSubscription(userId: string): Promise<Subscription> {
  const existing = await getSubscription(userId)
  if (existing) return existing

  const now = new Date()
  const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)

  const rows = await db.insert(subscriptions).values({
    userId,
    status: 'trialing',
    minutesLimit: TRIAL_MINUTES,
    currentPeriodStart: now,
    currentPeriodEnd: trialEnd,
    trialEndsAt: trialEnd,
  }).returning()

  return rows[0]
}

export async function upsertSubscription(data: NewSubscription): Promise<Subscription> {
  const existing = await getSubscription(data.userId)
  if (existing) {
    const rows = await db
      .update(subscriptions)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(subscriptions.userId, data.userId))
      .returning()
    return rows[0]
  }

  const rows = await db.insert(subscriptions).values(data).returning()
  return rows[0]
}

export async function updateSubscriptionByPaddleId(
  paddleSubId: string,
  data: Partial<NewSubscription>
): Promise<void> {
  await db
    .update(subscriptions)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(subscriptions.paddleSubscriptionId, paddleSubId))
}

export async function getAllSubscriptions(): Promise<Subscription[]> {
  return db.select().from(subscriptions)
}
