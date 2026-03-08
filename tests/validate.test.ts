import { describe, it, expect } from 'vitest'
import { validateProfile, validateBlobUrl, safeErrorMessage } from '@/lib/pipeline/validate'

describe('validateProfile', () => {
  it('accepts valid profiles', () => {
    expect(validateProfile('fundur')).toBe('fundur')
    expect(validateProfile('fyrirlestur')).toBe('fyrirlestur')
    expect(validateProfile('viðtal')).toBe('viðtal')
    expect(validateProfile('frjálst')).toBe('frjálst')
    expect(validateProfile('stjórnarfundur')).toBe('stjórnarfundur')
  })

  it('defaults to fundur for invalid input', () => {
    expect(validateProfile('invalid')).toBe('fundur')
    expect(validateProfile('')).toBe('fundur')
    expect(validateProfile(null)).toBe('fundur')
    expect(validateProfile(undefined)).toBe('fundur')
    expect(validateProfile(123)).toBe('fundur')
    expect(validateProfile({})).toBe('fundur')
  })
})

describe('validateBlobUrl', () => {
  it('accepts valid Vercel Blob URLs', () => {
    expect(validateBlobUrl('https://abc123.vercel-storage.com/uploads/test.mp3')).toBe(true)
    expect(validateBlobUrl('https://something.public.blob.vercel-storage.com/file.m4a')).toBe(true)
  })

  it('rejects non-Vercel URLs', () => {
    expect(validateBlobUrl('https://evil.com/file.mp3')).toBe(false)
    expect(validateBlobUrl('https://fake-vercel-storage.com/file.mp3')).toBe(false)
    expect(validateBlobUrl('http://abc.vercel-storage.com/file.mp3')).toBe(false) // http not https
  })

  it('rejects invalid URLs', () => {
    expect(validateBlobUrl('')).toBe(false)
    expect(validateBlobUrl('not-a-url')).toBe(false)
    expect(validateBlobUrl('javascript:alert(1)')).toBe(false)
  })
})

describe('safeErrorMessage', () => {
  it('returns generic message regardless of input', () => {
    expect(safeErrorMessage(new Error('DB password leaked'))).toBe('Villa kom upp. Reyndu aftur.')
    expect(safeErrorMessage('string error')).toBe('Villa kom upp. Reyndu aftur.')
    expect(safeErrorMessage(null)).toBe('Villa kom upp. Reyndu aftur.')
  })
})
