#!/usr/bin/env node
/**
 * Sækir transcript úr gagnagrunni og vistar sem JSON fixture.
 *
 * Notkun:
 *   node scripts/fetch-fixture.mjs "University of Iceland 3"
 *   node scripts/fetch-fixture.mjs --id <session-id>
 *
 * Vistar í: tests/fixtures/<nafn>.json
 */

import { neon } from '@neondatabase/serverless'
import { writeFileSync, mkdirSync } from 'fs'
import { resolve } from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

const DATABASE_URL = process.env.DATABASE_URL
if (!DATABASE_URL) {
  console.error('DATABASE_URL vantar í .env.local')
  process.exit(1)
}

const sql = neon(DATABASE_URL)

const args = process.argv.slice(2)
let sessions

if (args[0] === '--id') {
  sessions = await sql`
    SELECT id, name, profile, locale, total_seconds
    FROM sessions WHERE id = ${args[1]}
  `
} else if (args[0] === '--list') {
  const rows = await sql`
    SELECT id, name, profile, locale, total_seconds, created_at
    FROM sessions
    ORDER BY created_at DESC
    LIMIT 20
  `
  console.log('\nSíðustu 20 lotur:\n')
  for (const r of rows) {
    const mins = Math.round(r.total_seconds / 60)
    console.log(`  ${r.id.slice(0, 8)}…  ${mins}m  [${r.profile}]  ${r.name}`)
  }
  process.exit(0)
} else {
  const name = args.join(' ')
  if (!name) {
    console.error('Notkun: node scripts/fetch-fixture.mjs "Nafn á lotu"')
    console.error('        node scripts/fetch-fixture.mjs --list')
    console.error('        node scripts/fetch-fixture.mjs --id <session-id>')
    process.exit(1)
  }
  sessions = await sql`
    SELECT id, name, profile, locale, total_seconds
    FROM sessions WHERE name ILIKE ${'%' + name + '%'}
    ORDER BY created_at DESC LIMIT 1
  `
}

if (!sessions.length) {
  console.error('Engin lota fannst.')
  process.exit(1)
}

const session = sessions[0]
console.log(`Fann: "${session.name}" [${session.profile}] (${Math.round(session.total_seconds / 60)} mín)`)

const chunkRows = await sql`
  SELECT seq, transcript, duration_seconds
  FROM chunks WHERE session_id = ${session.id}
  ORDER BY seq
`

if (!chunkRows.length) {
  console.error('Engin chunks fundust.')
  process.exit(1)
}

const fixture = {
  name: session.name,
  profile: session.profile,
  locale: session.locale,
  totalSeconds: session.total_seconds,
  fetchedAt: new Date().toISOString(),
  chunks: chunkRows.map(c => ({
    seq: c.seq,
    transcript: c.transcript,
    durationSeconds: c.duration_seconds,
  })),
  fullTranscript: chunkRows.map(c => c.transcript).filter(Boolean).join('\n\n'),
}

const dir = resolve('tests/fixtures')
mkdirSync(dir, { recursive: true })

const slug = session.name
  .toLowerCase()
  .replace(/[^a-z0-9áéíóúýþæöð]+/gi, '-')
  .replace(/-+/g, '-')
  .replace(/^-|-$/g, '')

const path = resolve(dir, `${slug}.json`)
writeFileSync(path, JSON.stringify(fixture, null, 2), 'utf-8')
console.log(`Vistað: ${path}`)
console.log(`Chunks: ${chunkRows.length}, Stafir: ${fixture.fullTranscript.length}`)
