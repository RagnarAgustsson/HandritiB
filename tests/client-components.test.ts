import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * Verify client component patterns:
 * - Refs are used for values needed across async boundaries (not just state)
 * - Session cleanup always calls ljúka endpoint
 * - MediaRecorder lifecycle is handled correctly
 */

const RECORD_CLIENT = 'app/[locale]/record/TakaUppClient.tsx'
const UPLOAD_CLIENT = 'app/[locale]/upload/HlaðaUppClient.tsx'
const BEINLINA_CLIENT = 'app/[locale]/live/BeinlinaClient.tsx'

describe('TakaUppClient recording lifecycle', () => {
  const content = fs.readFileSync(path.resolve(RECORD_CLIENT), 'utf-8')

  it('uses a ref for sessionId (avoids stale closure in async stop handler)', () => {
    expect(
      content.includes('sessionIdRef'),
      'TakaUppClient should use sessionIdRef to avoid stale closures in stöðvaUpptöku'
    ).toBe(true)
  })

  it('sets sessionIdRef when creating session', () => {
    expect(
      content.includes('sessionIdRef.current = sid') || content.includes('sessionIdRef.current = session'),
      'sessionIdRef must be set when session is created'
    ).toBe(true)
  })

  it('reads sessionIdRef in stop handler (not just state)', () => {
    // The stop handler should use the ref, not the state
    const stopFnMatch = content.match(/async function stöðvaUpptöku[\s\S]*?^  \}/m)
    if (stopFnMatch) {
      expect(
        stopFnMatch[0].includes('sessionIdRef.current'),
        'stöðvaUpptöku should read from sessionIdRef.current, not sessionId state'
      ).toBe(true)
    }
  })

  it('calls ljúka endpoint in stop handler', () => {
    expect(
      content.includes("aðgerð: 'ljúka'") || content.includes('aðgerð: "ljúka"'),
      'stöðvaUpptöku must call the ljúka endpoint to close the session'
    ).toBe(true)
  })

  it('clears interval before stopping recorder', () => {
    const stopSection = content.indexOf('stöðvaUpptöku')
    const clearIdx = content.indexOf('clearInterval', stopSection)
    const stopIdx = content.indexOf('recorder.stop()', stopSection)
    expect(
      clearIdx < stopIdx && clearIdx > stopSection,
      'Must clearInterval before recorder.stop() to prevent race conditions'
    ).toBe(true)
  })

  it('stops media tracks on cleanup', () => {
    expect(
      content.includes('getTracks().forEach'),
      'Must stop media tracks to release microphone'
    ).toBe(true)
  })

  it('has useEffect cleanup for unmount', () => {
    // Verify there's a cleanup useEffect that stops tracks and closes SSE
    expect(content.includes('recorderRef.current?.stream?.getTracks')).toBe(true)
    expect(content.includes('eventSourceRef.current?.close()')).toBe(true)
  })

  it('waits before calling ljúka to let last chunk finish', () => {
    const stopSection = content.indexOf('stöðvaUpptöku')
    expect(
      content.indexOf('setTimeout', stopSection) > stopSection ||
      content.indexOf('new Promise', stopSection) > stopSection,
      'stöðvaUpptöku should wait for last chunk before calling ljúka'
    ).toBe(true)
  })
})

describe('client components use correct color tokens', () => {
  const clientFiles = [
    RECORD_CLIENT,
    UPLOAD_CLIENT,
  ]

  for (const file of clientFiles) {
    if (!fs.existsSync(path.resolve(file))) continue
    const content = fs.readFileSync(path.resolve(file), 'utf-8')
    const basename = path.basename(file)

    it(`${basename}: primary buttons use bg-indigo-500 (not 600)`, () => {
      // bg-indigo-600 is too dark on zinc-950 in Tailwind v4
      const lines = content.split('\n')
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes('bg-indigo-600') && !lines[i].includes('hover:bg-indigo-600')) {
          throw new Error(
            `${basename}:${i + 1} uses bg-indigo-600 (too dark on zinc-950). Use bg-indigo-500 with hover:bg-indigo-600`
          )
        }
      }
    })

    it(`${basename}: warning/status colors use amber (not indigo)`, () => {
      // Verify amber is used for warnings, not accidentally swapped to indigo
      if (content.includes('ephemeral') || content.includes('experimental')) {
        const hasAmber = content.includes('amber')
        if (content.includes('ephemeralNote') || content.includes('experimentalBadge')) {
          expect(hasAmber, `${basename}: warning/experimental indicators should use amber colors`).toBe(true)
        }
      }
    })
  }
})

describe('SSE step handling in upload clients', () => {
  const uploadClients = [
    { file: UPLOAD_CLIENT, name: 'HlaðaUppClient' },
  ]

  for (const { file, name } of uploadClients) {
    if (!fs.existsSync(path.resolve(file))) continue
    const content = fs.readFileSync(path.resolve(file), 'utf-8')

    it(`${name}: handles both 'done' and 'lokið' completion steps`, () => {
      expect(content.includes("'done'") || content.includes('"done"'), `${name} must handle 'done'`).toBe(true)
      expect(content.includes("'lokið'") || content.includes('"lokið"'), `${name} must handle 'lokið'`).toBe(true)
    })

    it(`${name}: handles both 'error' and 'villa' error steps`, () => {
      expect(content.includes("'error'") || content.includes('"error"'), `${name} must handle 'error'`).toBe(true)
      expect(content.includes("'villa'") || content.includes('"villa"'), `${name} must handle 'villa'`).toBe(true)
    })
  }
})
