import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * Ensure SSE step names sent by the server match what clients expect.
 * This catches the exact bug where server sends 'done'/'error' but client checks 'lokið'/'villa'.
 */

const SERVER_ROUTES = [
  'app/api/hljod-skra/route.ts',
  'app/api/hljod-stort/route.ts',
]

const CLIENT_COMPONENTS = [
  'app/[locale]/upload/HlaðaUppClient.tsx',
  'app/[locale]/upload/StorSkraClient.tsx',
]

function extractServerSteps(filePath: string): string[] {
  const content = fs.readFileSync(path.resolve(filePath), 'utf-8')
  const steps: string[] = []
  // Match: step: 'xxx' or step: "xxx"
  const regex = /step:\s*['"]([^'"]+)['"]/g
  let match
  while ((match = regex.exec(content)) !== null) {
    steps.push(match[1])
  }
  return [...new Set(steps)]
}

function extractClientChecks(filePath: string): string[] {
  const content = fs.readFileSync(path.resolve(filePath), 'utf-8')
  const checks: string[] = []
  // Match: data.step === 'xxx' or data.step === "xxx"
  const regex = /data\.step\s*===\s*['"]([^'"]+)['"]/g
  let match
  while ((match = regex.exec(content)) !== null) {
    checks.push(match[1])
  }
  return [...new Set(checks)]
}

describe('SSE step name consistency', () => {
  it('server completion step is handled by all clients', () => {
    for (const route of SERVER_ROUTES) {
      const serverSteps = extractServerSteps(route)
      const hasDone = serverSteps.includes('done')
      const hasLokid = serverSteps.includes('lokið')

      for (const client of CLIENT_COMPONENTS) {
        const clientChecks = extractClientChecks(client)

        if (hasDone) {
          expect(clientChecks, `${client} must handle 'done' step from ${route}`).toContain('done')
        }
        if (hasLokid) {
          expect(clientChecks, `${client} must handle 'lokið' step from ${route}`).toContain('lokið')
        }
      }
    }
  })

  it('server error step is handled by all clients', () => {
    for (const route of SERVER_ROUTES) {
      const serverSteps = extractServerSteps(route)
      const hasError = serverSteps.includes('error')
      const hasVilla = serverSteps.includes('villa')

      for (const client of CLIENT_COMPONENTS) {
        const clientChecks = extractClientChecks(client)

        if (hasError) {
          expect(clientChecks, `${client} must handle 'error' step from ${route}`).toContain('error')
        }
        if (hasVilla) {
          expect(clientChecks, `${client} must handle 'villa' step from ${route}`).toContain('villa')
        }
      }
    }
  })

  it('all server progress steps have client-side labels', () => {
    const route = 'app/api/hljod-skra/route.ts'
    const serverSteps = extractServerSteps(route)
    const progressSteps = serverSteps.filter(s => !['done', 'lokið', 'error', 'villa'].includes(s))

    // Check that translation keys exist in the upload steps
    const isMessages = JSON.parse(fs.readFileSync('messages/is.json', 'utf-8'))
    const stepLabels = isMessages.upload?.steps || {}

    for (const step of progressSteps) {
      expect(stepLabels, `Missing upload.steps.${step} translation for server step "${step}"`).toHaveProperty(step)
    }
  })
})
