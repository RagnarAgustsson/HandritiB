import { desc } from 'drizzle-orm'
import { db } from './client'
import { contactMessages } from './schema'

export async function createContactMessage(email: string, message: string) {
  const [msg] = await db.insert(contactMessages).values({ email, message }).returning()
  return msg
}

export async function getContactMessages() {
  return db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt)).limit(100)
}
