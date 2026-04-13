import { createWorker } from 'tesseract.js'
import nspell from 'nspell'
import path from 'path'
import { app } from 'electron'
import { getDuration, extractFrame } from './ffmpeg.js'

export function shouldSkip(word) {
  if (word.length < 3) return true
  if (word === word.toUpperCase()) return true
  if (/\d/.test(word)) return true
  if (/[^a-zA-Z]/.test(word)) return true
  return false
}

function extractWords(text) {
  return text
    .split(/\s+/)
    .map((t) => t.replace(/^[^a-zA-Z\d]+|[^a-zA-Z\d]+$/g, ''))
    .filter(Boolean)
}

export async function scanVideo(filePath) {
  let worker
  try {
    const duration = await getDuration(filePath)
    const frameCount = Math.min(Math.ceil(duration), 30)

    const { default: dict } = await import('dictionary-en')
    const spell = nspell(dict)

    const cacheDir = path.join(app.getPath('userData'), 'tessdata')
    worker = await createWorker('eng', 1, { cachePath: cacheDir })
    const seen = new Set()
    const flags = []

    for (let i = 0; i < frameCount; i++) {
      const timecode = i
      const imageData = await extractFrame(filePath, timecode)
      const {
        data: { text },
      } = await worker.recognize(imageData)

      for (const word of extractWords(text)) {
        if (shouldSkip(word)) continue
        if (seen.has(word)) continue
        seen.add(word)
        if (!spell.correct(word)) {
          flags.push({ word, timecode })
        }
      }
    }

    await worker.terminate()

    return flags.length > 0
      ? { status: 'warnings', flags }
      : { status: 'clean', flags: [] }
  } catch (err) {
    console.error('[vetter] scan failed:', err)
    if (worker) await worker.terminate()
    return { status: 'error', flags: [], error: err.message }
  }
}
