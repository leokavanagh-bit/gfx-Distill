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
