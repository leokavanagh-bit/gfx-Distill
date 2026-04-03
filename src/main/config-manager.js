import { app } from 'electron'
import fs from 'fs/promises'
import path from 'path'

export const DEFAULT_CONFIG = {
  pngWatchFolder: '',
  studios: []
}

function configPath() {
  return path.join(app.getPath('userData'), 'config.json')
}

export async function loadConfig() {
  try {
    const raw = await fs.readFile(configPath(), 'utf-8')
    return JSON.parse(raw)
  } catch (err) {
    if (err.code === 'ENOENT') return DEFAULT_CONFIG
    throw err
  }
}

export async function saveConfig(config) {
  await fs.writeFile(configPath(), JSON.stringify(config, null, 2), 'utf-8')
}

export async function exportConfig(destPath, config) {
  await fs.writeFile(destPath, JSON.stringify(config, null, 2), 'utf-8')
}

export async function importConfig(srcPath) {
  const raw = await fs.readFile(srcPath, 'utf-8')
  const config = JSON.parse(raw)
  await saveConfig(config)
  return config
}
