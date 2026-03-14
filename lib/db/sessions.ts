import { eq, desc, and, gt, lt, sql } from 'drizzle-orm'
import { db } from './client'
import { sessions, chunks, notes, type NewSession } from './schema'

export async function createSession(data: Omit<NewSession, 'id' | 'createdAt' | 'updatedAt'>) {
  const [session] = await db.insert(sessions).values(data).returning()
  return session
}

export async function getSession(id: string) {
  return db.query.sessions.findFirst({ where: eq(sessions.id, id) })
}

export async function getUserSessions(userId: string) {
  return db.select().from(sessions).where(eq(sessions.userId, userId)).orderBy(desc(sessions.createdAt))
}

export async function updateSession(id: string, data: Partial<typeof sessions.$inferInsert>) {
  const [updated] = await db.update(sessions).set({ ...data, updatedAt: new Date() }).where(eq(sessions.id, id)).returning()
  return updated
}

export async function getSessionWithChunksAndNotes(id: string) {
  const session = await db.query.sessions.findFirst({
    where: eq(sessions.id, id),
    with: { chunks: true, notes: true },
  })
  return session
}

export async function createChunk(data: { sessionId: string; seq: number; transcript: string; durationSeconds: number }) {
  const [chunk] = await db.insert(chunks).values(data).returning()
  return chunk
}

export async function createNote(data: { sessionId: string; chunkId?: string; content: string; rollingSummary?: string }) {
  const [note] = await db.insert(notes).values(data).returning()
  return note
}

export async function getSessionNotes(sessionId: string) {
  return db.select().from(notes).where(eq(notes.sessionId, sessionId)).orderBy(notes.createdAt)
}

export async function getSessionChunks(sessionId: string) {
  return db.select().from(chunks).where(eq(chunks.sessionId, sessionId)).orderBy(chunks.seq)
}

/**
 * Atomically claim a session for summarization by setting status from 'virkt' to 'lokið'.
 * Returns the updated session if successful, or null if another request already claimed it.
 */
export async function claimSessionForSummary(id: string, data: Partial<typeof sessions.$inferInsert>) {
  const rows = await db
    .update(sessions)
    .set({ ...data, status: 'lokið', updatedAt: new Date() })
    .where(and(eq(sessions.id, id), eq(sessions.status, 'virkt')))
    .returning()
  return rows[0] || null
}

export async function deleteSession(id: string) {
  const [deleted] = await db.delete(sessions).where(eq(sessions.id, id)).returning()
  return deleted
}

export async function getActiveSessions() {
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  return db.select().from(sessions).where(
    and(eq(sessions.status, 'virkt'), gt(sessions.createdAt, cutoff))
  ).orderBy(desc(sessions.createdAt))
}

export async function closeSession(id: string) {
  const [updated] = await db.update(sessions).set({ status: 'lokið', updatedAt: new Date() }).where(eq(sessions.id, id)).returning()
  return updated
}

/**
 * Delete completed sessions older than retentionDays.
 * Cascades to chunks and notes via FK onDelete.
 * Returns the number of deleted sessions.
 */
export async function cleanupOldSessions(retentionDays = 90): Promise<number> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000)
  const deleted = await db
    .delete(sessions)
    .where(and(eq(sessions.status, 'lokið'), lt(sessions.createdAt, cutoff)))
    .returning({ id: sessions.id })
  return deleted.length
}
