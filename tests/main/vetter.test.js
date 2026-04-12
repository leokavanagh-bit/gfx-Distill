import { describe, it, expect, vi } from 'vitest'

// scanVideo mocks — declared here so vi.mock factories can reference them
const { mockGetDuration, mockExtractFrame, mockCreateWorker, mockRecognize, mockTerminate, mockCorrect, mockNspell } = vi.hoisted(() => ({
  mockGetDuration: vi.fn(),
  mockExtractFrame: vi.fn(),
  mockCreateWorker: vi.fn(),
  mockRecognize: vi.fn(),
  mockTerminate: vi.fn(),
  mockCorrect: vi.fn(),
  mockNspell: vi.fn(),
}))

vi.mock('electron', () => ({ app: { isPackaged: false } }))
vi.mock('../../src/main/ffmpeg.js', () => ({
  getDuration: mockGetDuration,
  extractFrame: mockExtractFrame,
}))
vi.mock('tesseract.js', () => ({
  createWorker: mockCreateWorker,
}))
vi.mock('dictionary-en', () => ({
  default: (cb) => cb(null, { aff: Buffer.from(''), dic: Buffer.from('') }),
}))
vi.mock('nspell', () => ({
  default: mockNspell,
}))

import { shouldSkip } from '../../src/main/vetter.js'

describe('shouldSkip', () => {
  it('skips ALL-CAPS words', () => {
    expect(shouldSkip('BBC')).toBe(true)
    expect(shouldSkip('SPORT')).toBe(true)
    expect(shouldSkip('HD')).toBe(true)
  })

  it('skips words shorter than 3 characters', () => {
    expect(shouldSkip('of')).toBe(true)
    expect(shouldSkip('in')).toBe(true)
    expect(shouldSkip('ab')).toBe(true)
  })

  it('skips words containing digits', () => {
    expect(shouldSkip('S01E03')).toBe(true)
    expect(shouldSkip('8C378D')).toBe(true)
    expect(shouldSkip('item2')).toBe(true)
  })

  it('skips words containing non-alphabetic punctuation', () => {
    expect(shouldSkip('http://example.com')).toBe(true)
    expect(shouldSkip('@handle')).toBe(true)
    expect(shouldSkip('file.txt')).toBe(true)
  })

  it('does not skip normal mixed-case words', () => {
    expect(shouldSkip('hello')).toBe(false)
    expect(shouldSkip('Recieve')).toBe(false)
    expect(shouldSkip('Today')).toBe(false)
  })
})
