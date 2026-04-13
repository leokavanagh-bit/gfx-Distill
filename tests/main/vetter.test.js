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

vi.mock('electron', () => ({ app: { isPackaged: false, getPath: () => '/tmp/test-userdata' } }))
vi.mock('../../src/main/ffmpeg.js', () => ({
  getDuration: mockGetDuration,
  extractFrame: mockExtractFrame,
}))
vi.mock('tesseract.js', () => ({
  createWorker: mockCreateWorker,
}))
vi.mock('dictionary-en', () => ({
  default: { aff: Buffer.from(''), dic: Buffer.from('') },
}))
vi.mock('nspell', () => ({
  default: mockNspell,
}))

import { shouldSkip, scanVideo } from '../../src/main/vetter.js'

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

describe('scanVideo', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetDuration.mockResolvedValue(3)
    mockExtractFrame.mockResolvedValue('data:image/png;base64,abc')
    mockRecognize.mockResolvedValue({ data: { text: '' } })
    mockTerminate.mockResolvedValue()
    mockCreateWorker.mockResolvedValue({ recognize: mockRecognize, terminate: mockTerminate })
    mockNspell.mockReturnValue({ correct: mockCorrect })
    mockCorrect.mockReturnValue(true)
  })
  it('returns clean when all words pass spell check', async () => {
    mockRecognize.mockResolvedValue({ data: { text: 'hello world' } })
    mockCorrect.mockReturnValue(true)
    const result = await scanVideo('/test.mxf')
    expect(result).toEqual({ status: 'clean', flags: [] })
  })

  it('returns warnings with flagged words when misspellings found', async () => {
    mockGetDuration.mockResolvedValue(2)
    mockRecognize.mockResolvedValue({ data: { text: 'recieve' } })
    mockCorrect.mockImplementation((word) => word !== 'recieve')
    const result = await scanVideo('/test.mxf')
    expect(result.status).toBe('warnings')
    expect(result.flags).toContainEqual({ word: 'recieve', timecode: 0 })
  })

  it('deduplicates the same word at the same timecode', async () => {
    mockGetDuration.mockResolvedValue(1)
    mockRecognize.mockResolvedValue({ data: { text: 'recieve recieve' } })
    mockCorrect.mockReturnValue(false)
    const result = await scanVideo('/test.mxf')
    expect(result.flags.filter((f) => f.timecode === 0)).toHaveLength(1)
  })

  it('reports the same word only once even if it appears across multiple frames', async () => {
    mockGetDuration.mockResolvedValue(3)
    mockRecognize.mockResolvedValue({ data: { text: 'recieve' } })
    mockCorrect.mockReturnValue(false)
    const result = await scanVideo('/test.mxf')
    expect(result.flags).toHaveLength(1)
    expect(result.flags[0].word).toBe('recieve')
  })

  it('caps frame extraction at 30 frames regardless of video duration', async () => {
    mockGetDuration.mockResolvedValue(60)
    await scanVideo('/test.mxf')
    expect(mockExtractFrame).toHaveBeenCalledTimes(30)
  })

  it('skips words matching shouldSkip rules (ALL-CAPS, short, digits, punctuation)', async () => {
    mockGetDuration.mockResolvedValue(1)
    mockRecognize.mockResolvedValue({ data: { text: 'BBC HD S01E03 http://example.com' } })
    mockCorrect.mockReturnValue(false) // would flag if checked
    const result = await scanVideo('/test.mxf')
    expect(result.status).toBe('clean')
    expect(result.flags).toHaveLength(0)
  })

  it('returns error status when getDuration throws', async () => {
    mockGetDuration.mockRejectedValue(new Error('probe failed'))
    const result = await scanVideo('/test.mxf')
    expect(result.status).toBe('error')
    expect(result.error).toBe('probe failed')
    expect(result.flags).toEqual([])
  })

  it('returns error status when a frame extraction throws', async () => {
    mockExtractFrame.mockRejectedValue(new Error('ffmpeg error'))
    const result = await scanVideo('/test.mxf')
    expect(result.status).toBe('error')
  })

  it('terminates worker even when frame extraction throws', async () => {
    mockExtractFrame.mockRejectedValue(new Error('ffmpeg error'))
    await scanVideo('/test.mxf')
    expect(mockTerminate).toHaveBeenCalled()
  })

  it('strips leading/trailing punctuation before spell-checking (e.g. "recieve.")', async () => {
    mockGetDuration.mockResolvedValue(1)
    mockRecognize.mockResolvedValue({ data: { text: 'recieve.' } })
    mockCorrect.mockImplementation((word) => word !== 'recieve')
    const result = await scanVideo('/test.mxf')
    expect(result.status).toBe('warnings')
    expect(result.flags).toContainEqual({ word: 'recieve', timecode: 0 })
  })
})
