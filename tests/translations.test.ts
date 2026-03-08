import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * Verify translation consistency:
 * - All logAction names have matching admin.actionLabels keys
 * - All language files have the same keys
 * - No missing translations across languages
 */

const LOCALE_FILES = ['is', 'nb', 'da', 'sv']

function loadMessages(locale: string) {
  return JSON.parse(fs.readFileSync(path.resolve(`messages/${locale}.json`), 'utf-8'))
}

function extractLogActions(): string[] {
  const actions: string[] = []
  const apiDir = 'app/api'

  function scanDir(dir: string) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        scanDir(full)
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
        const content = fs.readFileSync(full, 'utf-8')
        // Match: logAction(userId, email, 'action.name', ...)
        const regex = /logAction\([^,]+,\s*[^,]+,\s*['"]([^'"]+)['"]/g
        let match
        while ((match = regex.exec(content)) !== null) {
          actions.push(match[1])
        }
      }
    }
  }

  scanDir(apiDir)
  return [...new Set(actions)]
}

describe('admin action label translations', () => {
  it('every logAction name has a matching translation key in all languages', () => {
    const actions = extractLogActions()

    for (const locale of LOCALE_FILES) {
      const messages = loadMessages(locale)
      const actionLabels = messages.admin?.actionLabels || {}

      for (const action of actions) {
        // logAction uses dots, translation keys use underscores
        const key = action.replace(/\./g, '_')
        expect(
          actionLabels,
          `Missing admin.actionLabels.${key} in ${locale}.json (for action "${action}")`
        ).toHaveProperty(key)
      }
    }
  })
})

describe('translation key consistency across languages', () => {
  function getKeys(obj: Record<string, unknown>, prefix = ''): string[] {
    const keys: string[] = []
    for (const [key, value] of Object.entries(obj)) {
      const fullKey = prefix ? `${prefix}.${key}` : key
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        keys.push(...getKeys(value as Record<string, unknown>, fullKey))
      } else {
        keys.push(fullKey)
      }
    }
    return keys.sort()
  }

  it('all locale files have identical key sets', () => {
    const referenceLocale = 'is'
    const referenceMessages = loadMessages(referenceLocale)
    const referenceKeys = getKeys(referenceMessages)

    for (const locale of LOCALE_FILES.filter(l => l !== referenceLocale)) {
      const messages = loadMessages(locale)
      const keys = getKeys(messages)

      const missingInLocale = referenceKeys.filter(k => !keys.includes(k))
      const extraInLocale = keys.filter(k => !referenceKeys.includes(k))

      expect(
        missingInLocale,
        `Keys missing in ${locale}.json (present in ${referenceLocale}.json)`
      ).toEqual([])
      expect(
        extraInLocale,
        `Extra keys in ${locale}.json (not in ${referenceLocale}.json)`
      ).toEqual([])
    }
  })

  it('no translation values are empty strings', () => {
    for (const locale of LOCALE_FILES) {
      const messages = loadMessages(locale)
      const keys = getKeys(messages)

      for (const key of keys) {
        const value = key.split('.').reduce((obj: any, k) => obj?.[k], messages)
        expect(value, `Empty translation for ${key} in ${locale}.json`).not.toBe('')
      }
    }
  })
})
