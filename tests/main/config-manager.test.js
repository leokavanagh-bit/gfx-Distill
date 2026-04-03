import { describe, it, expect, vi, beforeEach } from 'vitest'
import path from 'path'
import { loadConfig, saveConfig, exportConfig, importConfig, DEFAULT_CONFIG } from '../../src/main/config-manager.js'

vi.mock('electron', () => ({
  app: { getPath: vi.fn(() => '/mock/userData') }
}))

vi.mock('fs/promises', () => ({
  default: {
    readFile: vi.fn(),
    writeFile: vi.fn(),
    copyFile: vi.fn(),
  }
}))

import fs from 'fs/promises'

const CONFIG_PATH = path.join('/mock/userData', 'config.json')

const SAMPLE_CONFIG = {
  pngWatchFolder: '\\\\server\\share\\png_watch\\',
  studios: [
    { name: 'London', uncPath: '\\\\lon-gv01\\watch\\' },
    { name: 'Manchester', uncPath: '\\\\man-gv01\\watch\\' },
  ]
}

beforeEach(() => vi.clearAllMocks())

describe('loadConfig', () => {
  it('returns parsed config when file exists', async () => {
    fs.readFile.mockResolvedValue(JSON.stringify(SAMPLE_CONFIG))
    const result = await loadConfig()
    expect(result).toEqual(SAMPLE_CONFIG)
    expect(fs.readFile).toHaveBeenCalledWith(CONFIG_PATH, 'utf-8')
  })

  it('returns DEFAULT_CONFIG when file does not exist', async () => {
    fs.readFile.mockRejectedValue({ code: 'ENOENT' })
    const result = await loadConfig()
    expect(result).toEqual(DEFAULT_CONFIG)
  })
})

describe('saveConfig', () => {
  it('writes config as formatted JSON to app data path', async () => {
    fs.writeFile.mockResolvedValue()
    await saveConfig(SAMPLE_CONFIG)
    expect(fs.writeFile).toHaveBeenCalledWith(
      CONFIG_PATH,
      JSON.stringify(SAMPLE_CONFIG, null, 2),
      'utf-8'
    )
  })
})

describe('exportConfig', () => {
  it('writes config JSON to the specified destination path', async () => {
    fs.writeFile.mockResolvedValue()
    await exportConfig('/some/dest/config.json', SAMPLE_CONFIG)
    expect(fs.writeFile).toHaveBeenCalledWith(
      '/some/dest/config.json',
      JSON.stringify(SAMPLE_CONFIG, null, 2),
      'utf-8'
    )
  })
})

describe('importConfig', () => {
  it('reads config from src path, saves it, and returns it', async () => {
    fs.readFile.mockResolvedValue(JSON.stringify(SAMPLE_CONFIG))
    fs.writeFile.mockResolvedValue()
    const result = await importConfig('/some/src/config.json')
    expect(result).toEqual(SAMPLE_CONFIG)
    expect(fs.writeFile).toHaveBeenCalledWith(
      CONFIG_PATH,
      JSON.stringify(SAMPLE_CONFIG, null, 2),
      'utf-8'
    )
  })
})
