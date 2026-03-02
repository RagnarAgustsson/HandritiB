import { pgTable, text, integer, timestamp, pgEnum } from 'drizzle-orm/pg-core'

export const profileEnum = pgEnum('profile', ['fundur', 'fyrirlestur', 'viðtal', 'frjálst', 'stjórnarfundur'])
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

// ── Áskriftir & Notkun ─────────────────────────────────────

export const subscriptionStatusEnum = pgEnum('subscription_status', [
  'trialing',
  'active',
  'past_due',
  'canceled',
  'paused',
])

export const subscriptions = pgTable('subscriptions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().unique(),
  paddleSubscriptionId: text('paddle_subscription_id').unique(),
  paddleCustomerId: text('paddle_customer_id'),
  status: subscriptionStatusEnum('status').notNull().default('trialing'),
  planId: text('plan_id'),
  currentPeriodStart: timestamp('current_period_start'),
  currentPeriodEnd: timestamp('current_period_end'),
  trialEndsAt: timestamp('trial_ends_at'),
  canceledAt: timestamp('canceled_at'),
  minutesLimit: integer('minutes_limit').notNull().default(60),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
})

export const usageRecords = pgTable('usage_records', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull(),
  sessionId: text('session_id').references(() => sessions.id, { onDelete: 'set null' }),
  seconds: integer('seconds').notNull().default(0),
  source: text('source').notNull(),
  periodStart: timestamp('period_start').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export const freeAccessGrants = pgTable('free_access_grants', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().unique(),
  grantedBy: text('granted_by').notNull(),
  reason: text('reason'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type Subscription = typeof subscriptions.$inferSelect
export type NewSubscription = typeof subscriptions.$inferInsert
export type UsageRecord = typeof usageRecords.$inferSelect
export type FreeAccessGrant = typeof freeAccessGrants.$inferSelect
