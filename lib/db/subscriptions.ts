import { eq } from 'drizzle-orm'
import { db } from './client'
import { subscriptions, type Subscription, type NewSubscription } from './schema'

const TRIAL_DAYS = 7
const TRIAL_MINUTES = 60
const PAID_MINUTES = 300

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
  const now = new Date()
  const trialEnd = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000)

  // Atomic: insert only if no subscription exists for this userId (unique constraint).
  // onConflictDoNothing prevents race condition where two concurrent requests
  // could both pass the "existing" check and insert two rows.
  const rows = await db.insert(subscriptions).values({
    userId,
    status: 'trialing',
    minutesLimit: TRIAL_MINUTES,
    currentPeriodStart: now,
    currentPeriodEnd: trialEnd,
    trialEndsAt: trialEnd,
  }).onConflictDoNothing({ target: subscriptions.userId }).returning()

  // If conflict occurred (row already exists), fetch and return the existing one
  if (rows.length === 0) {
    const existing = await getSubscription(userId)
    return existing!
  }

  return rows[0]
}

export async function upsertSubscription(data: NewSubscription): Promise<Subscription> {
  const { userId, ...rest } = data
  const rows = await db
    .insert(subscriptions)
    .values(data)
    .onConflictDoUpdate({
      target: subscriptions.userId,
      set: { ...rest, updatedAt: new Date() },
    })
    .returning()
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
