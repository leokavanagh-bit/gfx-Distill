import { describe, it, expect, vi, beforeEach } from 'vitest'
import { copyFile } from '../../src/main/file-transfer.js'

vi.mock('fs/promises', () => ({
  default: {
    copyFile: vi.fn(),
    mkdir: vi.fn(),
  }
}))

import fs from 'fs/promises'

beforeEach(() => vi.clearAllMocks())

describe('copyFile', () => {
  it('copies file from src to dest', async () => {
    fs.copyFile.mockResolvedValue()
    fs.mkdir.mockResolvedValue()
    await copyFile('/src/file.mxf', '\\\\server\\watch\\file.mxf')
    expect(fs.copyFile).toHaveBeenCalledWith('/src/file.mxf', '\\\\server\\watch\\file.mxf')
  })

  it('creates destination directory if it does not exist', async () => {
    fs.mkdir.mockResolvedValue()
    fs.copyFile.mockResolvedValue()
    await copyFile('/src/file.mxf', '\\\\server\\watch\\file.mxf')
    expect(fs.mkdir).toHaveBeenCalledWith('\\\\server\\watch\\', { recursive: true })
  })

  it('rejects with error when copy fails', async () => {
    fs.mkdir.mockResolvedValue()
    fs.copyFile.mockRejectedValue(new Error('Network unreachable'))
    await expect(copyFile('/src/file.mxf', '\\\\server\\watch\\file.mxf'))
      .rejects.toThrow('Network unreachable')
  })

  it('handles posix paths (/Volumes/...)', async () => {
    fs.mkdir.mockResolvedValue()
    fs.copyFile.mockResolvedValue()
    await copyFile('/renders/MyShow.mxf', '/Volumes/london/watch/MyShow.mxf')
    expect(fs.mkdir).toHaveBeenCalledWith('/Volumes/london/watch', { recursive: true })
    expect(fs.copyFile).toHaveBeenCalledWith('/renders/MyShow.mxf', '/Volumes/london/watch/MyShow.mxf')
  })

  it('rejects with error when directory creation fails', async () => {
    fs.mkdir.mockRejectedValue(new Error('Permission denied'))
    await expect(copyFile('/src/file.mxf', '\\\\server\\watch\\file.mxf'))
      .rejects.toThrow('Permission denied')
  })
})
