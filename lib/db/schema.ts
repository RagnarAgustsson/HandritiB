import { pgTable, text, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const profileEnum = pgEnum('profile', ['fundur', 'fyrirlestur', 'viðtal', 'frjálst'])
export const statusEnum = pgEnum('status', ['virkt', 'lokið', 'villa'])

export const sessions = pgTable('sessions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  name: text('name').notNull().default('Óskráð lota'),
  profile: profileEnum('profile').notNull().default('fundur'),
  status: statusEnum('status').notNull().default('virkt'),
  finalSummary: text('final_summary'),
  totalSeconds: integer('total_seconds').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const chunks = pgTable('chunks', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  seq: integer('seq').notNull(),
  transcript: text('transcript').notNull().default(''),
  durationSeconds: integer('duration_seconds').notNull().default(0),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const notes = pgTable('notes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  sessionId: text('session_id').notNull().references(() => sessions.id, { onDelete: 'cascade' }),
  chunkId: text('chunk_id').references(() => chunks.id, { onDelete: 'set null' }),
  content: text('content').notNull(),
  rollingSummary: text('rolling_summary'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert
export type Chunk = typeof chunks.$inferSelect
export type NewChunk = typeof chunks.$inferInsert
export type Note = typeof notes.$inferSelect
export type NewNote = typeof notes.$inferInsert

// ── Admin & Audit ────────────────────────────────────────────

export const admins = pgTable('admins', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().unique(),
  email: text('email').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const auditLog = pgTable('audit_log', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  email: text('email').notNull(),
  action: text('action').notNull(),
  details: text('details'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type Admin = typeof admins.$inferSelect
export type AuditLogEntry = typeof auditLog.$inferSelect
