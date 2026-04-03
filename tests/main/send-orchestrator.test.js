import { describe, it, expect, vi, beforeEach } from 'vitest'
import { executeSend } from '../../src/main/send-orchestrator.js'

vi.mock('../../src/main/ffmpeg.js', () => ({
  extractFrame: vi.fn().mockResolvedValue('data:image/png;base64,abc')
}))
vi.mock('../../src/main/exiftool.js', () => ({
  writeXmpMetadata: vi.fn().mockResolvedValue()
}))
vi.mock('../../src/main/file-transfer.js', () => ({
  copyFile: vi.fn().mockResolvedValue()
}))
vi.mock('fs/promises', () => ({
  default: {
    writeFile: vi.fn().mockResolvedValue(),
    unlink: vi.fn().mockResolvedValue(),
    access: vi.fn().mockResolvedValue(),
  }
}))

import { extractFrame } from '../../src/main/ffmpeg.js'
import { writeXmpMetadata } from '../../src/main/exiftool.js'
import { copyFile } from '../../src/main/file-transfer.js'
import fs from 'fs/promises'

const PARAMS = {
  mxfPath: '/renders/MyShow.mxf',
  scrubSeconds: 30,
  studio: { name: 'London', uncPath: '\\\\lon-gv01\\watch\\' },
  pngWatchFolder: '\\\\server\\png_watch\\',
  title: 'My Show S01E01',
  jobId: '8C378D',
}

beforeEach(() => vi.clearAllMocks())

describe('executeSend', () => {
  it('calls all steps in order and reports progress', async () => {
    const progress = []
    await executeSend(PARAMS, (p) => progress.push(p.step))

    expect(progress).toEqual([
      'extracting', 'writing-metadata', 'copying-mxf', 'copying-png', 'complete'
    ])
  })

  it('extracts frame at the given scrub position', async () => {
    await executeSend(PARAMS, () => {})
    expect(extractFrame).toHaveBeenCalledWith('/renders/MyShow.mxf', 30)
  })

  it('writes XMP metadata with title and jobId as description', async () => {
    await executeSend(PARAMS, () => {})
    expect(writeXmpMetadata).toHaveBeenCalledWith(
      expect.stringContaining('MyShow'),
      { title: 'My Show S01E01', description: '8C378D' }
    )
  })

  it('copies MXF to studio UNC path preserving filename', async () => {
    await executeSend(PARAMS, () => {})
    expect(copyFile).toHaveBeenCalledWith(
      '/renders/MyShow.mxf',
      '\\\\lon-gv01\\watch\\MyShow.mxf'
    )
  })

  it('copies PNG to fixed PNG watch folder with same base name', async () => {
    await executeSend(PARAMS, () => {})
    expect(copyFile).toHaveBeenCalledWith(
      expect.stringContaining('MyShow'),
      '\\\\server\\png_watch\\MyShow.png'
    )
  })

  it('cleans up temp PNG on success', async () => {
    await executeSend(PARAMS, () => {})
    expect(fs.unlink).toHaveBeenCalled()
  })

  it('handles UNC paths without trailing backslash', async () => {
    const paramsNoTrail = {
      ...PARAMS,
      studio: { name: 'London', uncPath: '\\\\lon-gv01\\watch' },  // no trailing backslash
      pngWatchFolder: '\\\\server\\png_watch',  // no trailing backslash
    }
    await executeSend(paramsNoTrail, () => {})
    expect(copyFile).toHaveBeenCalledWith(
      '/renders/MyShow.mxf',
      '\\\\lon-gv01\\watch\\MyShow.mxf'
    )
    expect(copyFile).toHaveBeenCalledWith(
      expect.stringContaining('MyShow'),
      '\\\\server\\png_watch\\MyShow.png'
    )
  })

  it('cleans up temp PNG on failure and rethrows with failed step', async () => {
    copyFile.mockRejectedValueOnce(new Error('Network unreachable'))
    const progress = []
    await expect(
      executeSend(PARAMS, (p) => progress.push(p))
    ).rejects.toThrow('Network unreachable')
    expect(fs.unlink).toHaveBeenCalled()
    const errorProgress = progress.find(p => p.step === 'error')
    expect(errorProgress.failedStep).toBe('copying-mxf')
  })
})
