import { getSubscription, createTrialSubscription } from '@/lib/db/subscriptions'
import { getUserUsageSummary } from '@/lib/db/usage'
import { hasFreeAccess } from '@/lib/db/free-access'
import { isAdmin } from '@/lib/db/admin'
import type { Subscription } from '@/lib/db/schema'

export interface AccessResult {
  allowed: boolean
  reason?: string
  subscription?: Subscription
  usage?: {
    usedSeconds: number
    limitSeconds: number
    remainingSeconds: number
    percentUsed: number
  }
}

export async function checkTranscriptionAccess(userId: string): Promise<AccessResult> {
  // 1. Admin — alltaf leyft
  if (await isAdmin(userId)) return { allowed: true }

  // 2. Frítt aðgangsleyfi — yfirskrifar allt
  if (await hasFreeAccess(userId)) return { allowed: true }

  // 3. Sækja eða búa til áskrift (auto-trial)
  let sub = await getSubscription(userId)
  if (!sub) sub = await createTrialSubscription(userId)

  // 4. Athuga stöðu áskriftar
  if (sub.status === 'canceled') {
    return { allowed: false, reason: 'Áskrift þín er niður fallin. Endurnýjaðu áskrift til að halda áfram.', subscription: sub }
  }

  if (sub.status === 'past_due') {
    return { allowed: false, reason: 'Greiðsla mistókst. Uppfærðu greiðsluupplýsingar til að halda áfram.', subscription: sub }
  }

  if (sub.status === 'trialing' && sub.trialEndsAt && sub.trialEndsAt < new Date()) {
    return { allowed: false, reason: 'Prufutímabil er liðið. Skráðu þig í áskrift til að halda áfram.', subscription: sub }
  }

  if (sub.status === 'paused') {
    return { allowed: false, reason: 'Áskrift þín er í bið. Endurvirkjaðu hana til að halda áfram.', subscription: sub }
  }

  // 5. Athuga notkunartakmörk
  const usage = await getUserUsageSummary(userId)
  if (usage.remainingSeconds <= 0) {
    const limitMin = Math.round(usage.limitSeconds / 60)
    return {
      allowed: false,
      reason: `Þú hefur notað allar ${limitMin} mínútur í þessu tímabili. Uppfærðu áskrift eða bíddu eftir næsta tímabili.`,
      subscription: sub,
      usage,
    }
  }

  return { allowed: true, subscription: sub, usage }
}
