#!/usr/bin/env node
/**
 * Keyrir bæði OpenAI og Gemini á sama transcript og birtir niðurstöður.
 *
 * Notkun:
 *   node scripts/compare-providers.mjs                          # notar default fixture
 *   node scripts/compare-providers.mjs tests/fixtures/foo.json  # sérstök fixture
 *   node scripts/compare-providers.mjs --notes-only             # aðeins yfirferð
 *   node scripts/compare-providers.mjs --summary-only           # aðeins samantekt
 *
 * Krefst: OPENAI_API_KEY og GEMINI_API_KEY í .env.local
 */

import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'fs'
import { resolve, basename } from 'path'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })
import OpenAI from 'openai'
import { GoogleGenerativeAI } from '@google/generative-ai'

// ── Args ────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const notesOnly = args.includes('--notes-only')
const summaryOnly = args.includes('--summary-only')
const fixtureArg = args.find(a => a.endsWith('.json'))

// ── Load fixture ────────────────────────────────────────────────────

function findFixture() {
  if (fixtureArg) return resolve(fixtureArg)
  const dir = resolve('tests/fixtures')
  const files = readdirSync(dir).filter(f => f.endsWith('.json'))
  if (!files.length) {
    console.error('Engin fixture fannst í tests/fixtures/')
    console.error('Keyrðu fyrst: node scripts/fetch-fixture.mjs "Nafn á lotu"')
    process.exit(1)
  }
  // Default: fyrsta fixture
  return resolve(dir, files[0])
}

const fixturePath = findFixture()
const fixture = JSON.parse(readFileSync(fixturePath, 'utf-8'))
console.log(`\n📄 Fixture: ${basename(fixturePath)}`)
console.log(`   ${fixture.name} [${fixture.profile}] — ${fixture.chunks.length} chunks, ${fixture.fullTranscript.length} stafir\n`)

// ── Load prompts (dynamic import frá TypeScript) ────────────────────

// Við getum ekki importað .ts beint, svo við hlaðum prompts-is.ts efnið
// handvirkt. Þetta er einfaldara en að setja upp tsx runner.

const promptsPath = resolve('lib/pipeline/prompts-is.ts')
const promptsSrc = readFileSync(promptsPath, 'utf-8')

// Draga út LANGUAGE_INSTRUCTIONS
function extractConst(src, name) {
  const re = new RegExp(`export const ${name} = \`([\\s\\S]*?)\`\\.trim\\(\\)`, 'm')
  const m = src.match(re)
  return m ? m[1].trim() : ''
}

// Draga út profileContext
function extractProfileContext(src, profile) {
  const re = new RegExp(`${profile}: \`([\\s\\S]*?)\`\\.trim\\(\\)`, 'm')
  const m = src.match(re)
  return m ? m[1].trim() : ''
}

const LANGUAGE_INSTRUCTIONS = extractConst(promptsSrc, 'LANGUAGE_INSTRUCTIONS')
const profileCtx = extractProfileContext(promptsSrc, fixture.profile)

// Einfaldaður system prompt fyrir samantekt
const summarySystem = `${LANGUAGE_INSTRUCTIONS}

${profileCtx}

Þú færð samfellda uppskrift úr tali.
Textinn kemur beint úr sjálfvirkri talgreiningu og getur innihaldið villur.
Hunsa augljósar villur og endurtekningar — einbeittu þér að merkingarbæru efni.

Verkefnið er að skrifa ítarlega og vandaða lokasamantekt.

Byrjaðu á stuttu yfirliti (2-4 setningar).
Farðu svo yfir helstu atriði í eðlilegri röð. Lýstu hverju í 2-5 setningum.

Sniðreglur:
- Notaðu feitletraðan texta fyrir kaflaheita, ekki ###
- Ekki nota *** eða --- sem skiptilínur
- Skrifaðu samfelldan, lesanlegan texta undir hverjum kafla
- Notaðu punktalista aðeins þar sem það á eðlilega við

Skilaðu eingöngu lokasamantektinni.`

// Einfaldaður system prompt fyrir yfirferð (notes)
const notesSystem = `${LANGUAGE_INSTRUCTIONS}

${profileCtx}

Þú færð texta úr sjálfvirkri talgreiningu.
Hunsa augljósar villur — einbeittu þér að merkingarbæru efni.

Búðu til glósur úr textanum.

Skilaðu eingöngu gildu JSON:
{
  "notes": ["Atriði 1", "Atriði 2"],
  "rollingSummary": "Stutt samantekt."
}`

// ── Clients ─────────────────────────────────────────────────────────

const openaiKey = process.env.OPENAI_API_KEY
const geminiKey = process.env.GEMINI_API_KEY

if (!openaiKey) { console.error('OPENAI_API_KEY vantar'); process.exit(1) }
if (!geminiKey) { console.error('GEMINI_API_KEY vantar'); process.exit(1) }

const openai = new OpenAI({ apiKey: openaiKey })
const gemini = new GoogleGenerativeAI(geminiKey)

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o'
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-pro'

// ── Runner ──────────────────────────────────────────────────────────

async function runOpenAI(systemPrompt, userMessage, json = false) {
  const t0 = Date.now()
  const res = await openai.chat.completions.create({
    model: OPENAI_MODEL,
    store: false,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ],
    ...(json && { response_format: { type: 'json_object' } }),
    temperature: 0.3,
  })
  const ms = Date.now() - t0
  const text = res.choices[0]?.message?.content || ''
  const usage = res.usage
  return { text, ms, tokens: usage?.total_tokens || 0, model: OPENAI_MODEL }
}

async function runGemini(systemPrompt, userMessage, json = false) {
  const t0 = Date.now()
  const model = gemini.getGenerativeModel({
    model: GEMINI_MODEL,
    systemInstruction: systemPrompt,
    generationConfig: {
      temperature: 0.3,
      ...(json && { responseMimeType: 'application/json' }),
    },
  })
  const res = await model.generateContent(userMessage)
  const ms = Date.now() - t0
  const text = res.response.text()
  const usage = res.response.usageMetadata
  return {
    text,
    ms,
    tokens: (usage?.promptTokenCount || 0) + (usage?.candidatesTokenCount || 0),
    model: GEMINI_MODEL,
  }
}

// ── Helpers ──────────────────────────────────────────────────────

/** Gemini getur skilað notes sem objects ({note: "..."}) í stað strengja */
function noteToString(n) {
  if (typeof n === 'string') return n
  if (n && typeof n === 'object') {
    // Try common keys: note, text, content, or first string value
    for (const key of ['note', 'text', 'content']) {
      if (typeof n[key] === 'string') return n[key]
    }
    const firstStr = Object.values(n).find(v => typeof v === 'string')
    if (firstStr) return firstStr
    return JSON.stringify(n)
  }
  return String(n)
}

// ── Main ────────────────────────────────────────────────────────────

const results = {}
const transcript = fixture.fullTranscript

// Nota fyrstu 2 chunks sem notes test (eðlilegra en allan textann)
const notesInput = fixture.chunks.slice(0, 2).map(c => c.transcript).filter(Boolean).join('\n\n')

if (!summaryOnly) {
  console.log('─── Yfirferð (notes) ───────────────────────────────────\n')

  const [oaiNotes, gemNotes] = await Promise.all([
    runOpenAI(notesSystem, notesInput, true),
    runGemini(notesSystem, notesInput, true),
  ])

  results.notes = { openai: oaiNotes, gemini: gemNotes }

  console.log(`  OpenAI (${oaiNotes.model}): ${oaiNotes.ms}ms, ${oaiNotes.tokens} tokens`)
  console.log(`  Gemini (${gemNotes.model}): ${gemNotes.ms}ms, ${gemNotes.tokens} tokens\n`)

  try {
    const oaiParsed = JSON.parse(oaiNotes.text)
    const gemParsed = JSON.parse(gemNotes.text)
    console.log('  OpenAI notes:')
    const oaiItems = Array.isArray(oaiParsed.notes) ? oaiParsed.notes : [oaiParsed.notes]
    oaiItems.forEach(n => console.log(`    • ${noteToString(n)}`))
    console.log()
    console.log('  Gemini notes:')
    const gemItems = Array.isArray(gemParsed.notes) ? gemParsed.notes : [gemParsed.notes]
    gemItems.forEach(n => console.log(`    • ${noteToString(n)}`))
  } catch {
    console.log('  (JSON parse error — sé hráa úttak í niðurstöðuskrá)')
  }
  console.log()
}

if (!notesOnly) {
  console.log('─── Samantekt (summary) ────────────────────────────────\n')

  const [oaiSum, gemSum] = await Promise.all([
    runOpenAI(summarySystem, transcript),
    runGemini(summarySystem, transcript),
  ])

  results.summary = { openai: oaiSum, gemini: gemSum }

  console.log(`  OpenAI (${oaiSum.model}): ${oaiSum.ms}ms, ${oaiSum.tokens} tokens`)
  console.log(`  Gemini (${gemSum.model}): ${gemSum.ms}ms, ${gemSum.tokens} tokens\n`)

  const sep = '·'.repeat(60)

  console.log('  ┌─ OpenAI ─────────────────────────────────────────────')
  oaiSum.text.split('\n').forEach(l => console.log(`  │ ${l}`))
  console.log(`  └${sep}`)
  console.log()
  console.log('  ┌─ Gemini ─────────────────────────────────────────────')
  gemSum.text.split('\n').forEach(l => console.log(`  │ ${l}`))
  console.log(`  └${sep}`)
}

// ── Vista niðurstöður sem lesanlega .md skrá ────────────────────────

const outDir = resolve('tests/results')
mkdirSync(outDir, { recursive: true })

const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
const slug = basename(fixturePath, '.json')
const outPath = resolve(outDir, `${slug}-${ts}.md`)

const lines = []
lines.push(`# Samanburður: ${fixture.name}`)
lines.push(``)
lines.push(`- **Dagsetning:** ${new Date().toISOString().slice(0, 10)}`)
lines.push(`- **Profile:** ${fixture.profile}`)
lines.push(`- **Chunks:** ${fixture.chunks.length}, **Stafir:** ${fixture.fullTranscript.length}`)
lines.push(`- **OpenAI:** ${OPENAI_MODEL}`)
lines.push(`- **Gemini:** ${GEMINI_MODEL}`)
lines.push(``)

if (results.notes) {
  const oai = results.notes.openai
  const gem = results.notes.gemini
  lines.push(`---`)
  lines.push(``)
  lines.push(`## Yfirferð (notes)`)
  lines.push(``)
  lines.push(`| | OpenAI (${oai.model}) | Gemini (${gem.model}) |`)
  lines.push(`|---|---|---|`)
  lines.push(`| Tími | ${(oai.ms / 1000).toFixed(1)}s | ${(gem.ms / 1000).toFixed(1)}s |`)
  lines.push(`| Tokens | ${oai.tokens.toLocaleString()} | ${gem.tokens.toLocaleString()} |`)
  lines.push(``)

  try {
    const oaiParsed = JSON.parse(oai.text)
    const gemParsed = JSON.parse(gem.text)
    const oaiItems = Array.isArray(oaiParsed.notes) ? oaiParsed.notes : [oaiParsed.notes]
    const gemItems = Array.isArray(gemParsed.notes) ? gemParsed.notes : [gemParsed.notes]

    lines.push(`### OpenAI`)
    lines.push(``)
    oaiItems.forEach(n => lines.push(`- ${noteToString(n)}`))
    lines.push(``)
    lines.push(`### Gemini`)
    lines.push(``)
    gemItems.forEach(n => lines.push(`- ${noteToString(n)}`))
    lines.push(``)
  } catch {
    lines.push(`(JSON parse error)`)
    lines.push(``)
  }
}

if (results.summary) {
  const oai = results.summary.openai
  const gem = results.summary.gemini
  lines.push(`---`)
  lines.push(``)
  lines.push(`## Samantekt (summary)`)
  lines.push(``)
  lines.push(`| | OpenAI (${oai.model}) | Gemini (${gem.model}) |`)
  lines.push(`|---|---|---|`)
  lines.push(`| Tími | ${(oai.ms / 1000).toFixed(1)}s | ${(gem.ms / 1000).toFixed(1)}s |`)
  lines.push(`| Tokens | ${oai.tokens.toLocaleString()} | ${gem.tokens.toLocaleString()} |`)
  lines.push(``)
  lines.push(`### OpenAI`)
  lines.push(``)
  lines.push(oai.text)
  lines.push(``)
  lines.push(`### Gemini`)
  lines.push(``)
  lines.push(gem.text)
  lines.push(``)
}

writeFileSync(outPath, lines.join('\n'), 'utf-8')

console.log(`\n💾 Niðurstöður vistaðar: ${outPath}\n`)
