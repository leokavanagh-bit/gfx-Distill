import { createWorker } from 'tesseract.js'
import nspell from 'nspell'
import dictionaryEn from 'dictionary-en'
import { promisify } from 'util'
import { getDuration, extractFrame } from './ffmpeg.js'

export function shouldSkip(word) {
  if (word.length < 3) return true
  if (word === word.toUpperCase()) return true
  if (/\d/.test(word)) return true
  if (/[^a-zA-Z]/.test(word)) return true
  return false
}

function extractWords(text) {
  return text.split(/\s+/).filter(Boolean)
}

export async function scanVideo(filePath) {
  try {
    const duration = await getDuration(filePath)
    const frameCount = Math.min(Math.ceil(duration), 30)

    const loadDict = promisify(dictionaryEn)
    const dict = await loadDict()
    const spell = nspell(dict)

    const worker = await createWorker('eng')
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
        const key = `${word}:${timecode}`
        if (seen.has(key)) continue
        seen.add(key)
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
    return { status: 'error', flags: [], error: err.message }
  }
}
