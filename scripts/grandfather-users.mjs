/**
 * One-time migration: Grant free access to all existing users.
 *
 * Queries unique userIds from the audit_log table and inserts a
 * free_access_grants row for each (permanent, no expiry).
 *
 * Usage:
 *   node scripts/grandfather-users.mjs
 *
 * Requires DATABASE_URL in .env.local (loaded via dotenv).
 */

import 'dotenv/config'
import { neon } from '@neondatabase/serverless'

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL vantar — athugaðu .env.local')
  process.exit(1)
}

const sql = neon(DATABASE_URL)

async function main() {
  // 1. Get all unique userIds from audit_log
  const users = await sql`
    SELECT DISTINCT user_id FROM audit_log
  `

  if (users.length === 0) {
    console.log('Engir notendur í audit_log. Ekkert að gera.')
    return
  }

  console.log(`Fann ${users.length} notendur í audit_log.`)

  let created = 0
  let skipped = 0

  for (const row of users) {
    const userId = row.user_id

    // Check if grant already exists
    const existing = await sql`
      SELECT id FROM free_access_grants WHERE user_id = ${userId} LIMIT 1
    `

    if (existing.length > 0) {
      skipped++
      continue
    }

    // Insert free access grant
    await sql`
      INSERT INTO free_access_grants (id, user_id, granted_by, reason, expires_at, created_at)
      VALUES (
        gen_random_uuid(),
        ${userId},
        'system',
        'Founding user — free access before payment launch',
        NULL,
        NOW()
      )
    `
    created++
  }

  console.log(`Lokið! ${created} frítt aðgangs-veitingar búnar til, ${skipped} þegar til staðar.`)
}

main().catch(err => {
  console.error('Villa:', err)
  process.exit(1)
})
