import { eq } from 'drizzle-orm'
import { db } from './client'
import { freeAccessGrants, type FreeAccessGrant } from './schema'

export async function hasFreeAccess(userId: string): Promise<boolean> {
  const rows = await db
    .select()
    .from(freeAccessGrants)
    .where(eq(freeAccessGrants.userId, userId))
    .limit(1)

  if (rows.length === 0) return false

  const grant = rows[0]
  if (grant.expiresAt && grant.expiresAt < new Date()) return false

  return true
}

export async function grantFreeAccess(
  userId: string,
  grantedBy: string,
  reason?: string,
  expiresAt?: Date
): Promise<void> {
  await db
    .insert(freeAccessGrants)
    .values({ userId, grantedBy, reason: reason || null, expiresAt: expiresAt || null })
    .onConflictDoUpdate({
      target: freeAccessGrants.userId,
      set: { grantedBy, reason: reason || null, expiresAt: expiresAt || null },
    })
}

export async function revokeFreeAccess(userId: string): Promise<void> {
  await db.delete(freeAccessGrants).where(eq(freeAccessGrants.userId, userId))
}

export async function getAllFreeAccessGrants(): Promise<FreeAccessGrant[]> {
  return db.select().from(freeAccessGrants)
}
