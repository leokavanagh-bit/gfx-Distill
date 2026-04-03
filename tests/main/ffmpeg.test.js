import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getDuration, extractFrame } from '../../src/main/ffmpeg.js'

// Mock fluent-ffmpeg
const mockFfprobeResult = { format: { duration: 120.5 } }

const mockFfmpegInstance = {
  seekInput: vi.fn().mockReturnThis(),
  frames: vi.fn().mockReturnThis(),
  output: vi.fn().mockReturnThis(),
  on: vi.fn().mockImplementation(function(event, cb) {
    if (event === 'end') setTimeout(cb, 0)
    return this
  }),
  run: vi.fn(),
}

vi.mock('fluent-ffmpeg', () => {
  const ffmpeg = vi.fn(() => mockFfmpegInstance)
  ffmpeg.setFfmpegPath = vi.fn()
  ffmpeg.setFfprobePath = vi.fn()
  ffmpeg.ffprobe = vi.fn((path, cb) => cb(null, mockFfprobeResult))
  return { default: ffmpeg }
})

vi.mock('ffmpeg-static', () => ({ default: '/mock/ffmpeg' }))
vi.mock('ffprobe-static', () => ({ default: { path: '/mock/ffprobe' } }))
vi.mock('fs/promises', () => ({
  default: { readFile: vi.fn().mockResolvedValue(Buffer.from('pngdata')) }
}))

beforeEach(() => vi.clearAllMocks())

describe('getDuration', () => {
  it('returns duration in seconds from ffprobe metadata', async () => {
    const duration = await getDuration('/path/to/file.mxf')
    expect(duration).toBe(120.5)
  })

  it('rejects when ffprobe returns an error', async () => {
    const { default: ffmpeg } = await import('fluent-ffmpeg')
    ffmpeg.ffprobe.mockImplementationOnce((p, cb) => cb(new Error('probe failed'), null))
    await expect(getDuration('/path/to/file.mxf')).rejects.toThrow('probe failed')
  })
})

describe('extractFrame', () => {
  it('returns a base64 data URL string', async () => {
    const result = await extractFrame('/path/to/file.mxf', 30)
    expect(result).toMatch(/^data:image\/png;base64,/)
  })

  it('seeks to the specified seconds', async () => {
    await extractFrame('/path/to/file.mxf', 45)
    expect(mockFfmpegInstance.seekInput).toHaveBeenCalledWith(45)
  })
})
