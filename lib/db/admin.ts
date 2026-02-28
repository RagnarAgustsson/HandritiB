import { eq, desc, sql } from 'drizzle-orm'
import { db } from './client'
import { admins, auditLog } from './schema'

const SEED_EMAIL = 'ragnara@gmail.com'

// ── Admin ────────────────────────────────────────────────────

export async function isAdmin(userId: string): Promise<boolean> {
  const row = await db.query.admins.findFirst({
    where: eq(admins.userId, userId),
  })
  return !!row
}

export async function bootstrapAdmin(userId: string, email: string): Promise<boolean> {
  if (await isAdmin(userId)) return true
  if (email.toLowerCase() !== SEED_EMAIL) return false

  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(admins)
  if (Number(count) > 0) return false

  await db.insert(admins).values({ userId, email }).onConflictDoNothing()
  return true
}

export async function addAdmin(userId: string, email: string) {
  await db.insert(admins).values({ userId, email }).onConflictDoNothing()
}

export async function removeAdmin(userId: string) {
  await db.delete(admins).where(eq(admins.userId, userId))
}

export async function getAllAdmins() {
  return db.select().from(admins).orderBy(desc(admins.createdAt))
}

// ── Audit ────────────────────────────────────────────────────

export async function logAction(userId: string, email: string, action: string, details?: string) {
  await db.insert(auditLog).values({ userId, email, action, details })
}

export async function getAuditLog(limit = 50, offset = 0) {
  return db.select().from(auditLog).orderBy(desc(auditLog.createdAt)).limit(limit).offset(offset)
}

export async function getAuditLogCount(): Promise<number> {
  const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(auditLog)
  return Number(count)
}

export async function getUniqueUsers() {
  const users = await db
    .select({
      userId: auditLog.userId,
      email: auditLog.email,
      lastSeen: sql<Date>`max(${auditLog.createdAt})`,
    })
    .from(auditLog)
    .groupBy(auditLog.userId, auditLog.email)
    .orderBy(desc(sql`max(${auditLog.createdAt})`))

  const adminList = await getAllAdmins()
  const adminIds = new Set(adminList.map(a => a.userId))

  return users.map(u => ({ ...u, isAdmin: adminIds.has(u.userId) }))
}
