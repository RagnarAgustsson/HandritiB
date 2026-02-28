import { eq, desc } from 'drizzle-orm'
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
