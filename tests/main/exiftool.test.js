import { describe, it, expect, vi, beforeEach } from 'vitest'
import { writeXmpMetadata } from '../../src/main/exiftool.js'

const mockWrite = vi.fn().mockResolvedValue(undefined)
const mockEnd = vi.fn().mockResolvedValue(undefined)

vi.mock('exiftool-vendored', () => ({
  ExifTool: vi.fn(function () {
    this.write = mockWrite
    this.end = mockEnd
  })
}))

beforeEach(() => vi.clearAllMocks())

describe('writeXmpMetadata', () => {
  it('writes XMP-dc:Title and XMP-dc:Description to the file', async () => {
    await writeXmpMetadata('/tmp/frame.png', { title: 'My Show S01E01', description: '8C378D' })

    expect(mockWrite).toHaveBeenCalledWith(
      '/tmp/frame.png',
      { 'XMP-dc:Title': 'My Show S01E01', 'XMP-dc:Description': '8C378D', 'XMP-dc:Subject': [] },
      ['-overwrite_original']
    )
  })

  it('calls exiftool.end() after writing', async () => {
    await writeXmpMetadata('/tmp/frame.png', { title: 'T', description: 'D' })
    expect(mockEnd).toHaveBeenCalled()
  })

  it('calls exiftool.end() even when write throws', async () => {
    mockWrite.mockRejectedValueOnce(new Error('write failed'))
    await expect(
      writeXmpMetadata('/tmp/frame.png', { title: 'T', description: 'D' })
    ).rejects.toThrow('write failed')
    expect(mockEnd).toHaveBeenCalled()
  })

  it('writes empty string for title when not provided', async () => {
    await writeXmpMetadata('/tmp/frame.png', { title: '', description: '8C378D' })
    expect(mockWrite).toHaveBeenCalledWith(
      '/tmp/frame.png',
      { 'XMP-dc:Title': '', 'XMP-dc:Description': '8C378D', 'XMP-dc:Subject': [] },
      ['-overwrite_original']
    )
  })

  it('parses keywords into an array for XMP-dc:Subject', async () => {
    await writeXmpMetadata('/tmp/frame.png', { title: 'T', description: 'D', keywords: 'sport, promo, live' })
    expect(mockWrite).toHaveBeenCalledWith(
      '/tmp/frame.png',
      { 'XMP-dc:Title': 'T', 'XMP-dc:Description': 'D', 'XMP-dc:Subject': ['sport', 'promo', 'live'] },
      ['-overwrite_original']
    )
  })
})
