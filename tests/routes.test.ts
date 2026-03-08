import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * Verify API route structure and configuration.
 * Catches issues like missing maxDuration, missing auth checks, etc.
 */

const API_ROUTES = [
  { path: 'app/api/hljod-skra/route.ts', needsAuth: true, needsMaxDuration: true },
  { path: 'app/api/hljod-stort/route.ts', needsAuth: true, needsMaxDuration: true },
  { path: 'app/api/hljod-hluti/route.ts', needsAuth: true, needsMaxDuration: true },
  { path: 'app/api/beinlina/route.ts', needsAuth: true, needsMaxDuration: false },
  { path: 'app/api/beinlina-vista/route.ts', needsAuth: true, needsMaxDuration: false },
  { path: 'app/api/lotur/route.ts', needsAuth: true, needsMaxDuration: false },
  { path: 'app/api/admin/route.ts', needsAuth: true, needsMaxDuration: false },
  { path: 'app/api/blob-upload/route.ts', needsAuth: true, needsMaxDuration: false },
  { path: 'app/api/contact/route.ts', needsAuth: false, needsMaxDuration: false },
]

describe('API route structure', () => {
  for (const route of API_ROUTES) {
    describe(route.path, () => {
      const content = fs.readFileSync(path.resolve(route.path), 'utf-8')

      if (route.needsAuth) {
        it('has auth check', () => {
          expect(
            content.includes('auth()') || content.includes('isAdmin'),
            `${route.path} should have auth() or isAdmin check`
          ).toBe(true)
        })
      }

      if (route.needsMaxDuration) {
        it('has maxDuration configured', () => {
          expect(
            content.includes('maxDuration'),
            `${route.path} should have maxDuration for long-running transcription`
          ).toBe(true)
        })
      }

      it('uses validateProfile for profile input', () => {
        // Only check routes that accept a profile parameter
        if (content.includes('profile') && content.includes('body')) {
          const usesValidation = content.includes('validateProfile')
          const usesProfileParam = /body\.profile|profile.*=.*body/i.test(content)
          if (usesProfileParam) {
            expect(
              usesValidation,
              `${route.path} accepts profile input but doesn't use validateProfile()`
            ).toBe(true)
          }
        }
      })

      it('uses validateBlobUrl for blob URL input', () => {
        if (content.includes('blobUrl') && content.includes('body')) {
          expect(
            content.includes('validateBlobUrl'),
            `${route.path} accepts blobUrl but doesn't use validateBlobUrl()`
          ).toBe(true)
        }
      })
    })
  }
})

describe('API route files exist', () => {
  it('all expected routes have route files', () => {
    for (const route of API_ROUTES) {
      expect(
        fs.existsSync(path.resolve(route.path)),
        `Missing route file: ${route.path}`
      ).toBe(true)
    }
  })
})
