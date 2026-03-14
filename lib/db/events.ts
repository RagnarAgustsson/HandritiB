import { db } from './client'
import { processedEvents } from './schema'

/**
 * Check if a webhook event has already been processed.
 * If not, mark it as processed and return false.
 * If already processed, return true.
 */
export async function isEventProcessed(eventId: string, eventType: string): Promise<boolean> {
  try {
    await db.insert(processedEvents).values({ eventId, eventType })
    return false
  } catch (error: unknown) {
    // Unique constraint violation = already processed
    const msg = error instanceof Error ? error.message : ''
    if (msg.includes('duplicate') || msg.includes('unique') || msg.includes('conflict')) {
      return true
    }
    throw error
  }
}
