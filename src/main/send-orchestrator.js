import path from 'path'
import os from 'os'
import fs from 'fs/promises'
import { extractFrame } from './ffmpeg.js'
import { writeXmpMetadata } from './exiftool.js'
import { copyFile } from './file-transfer.js'

export async function executeSend(params, onProgress) {
  const { mxfPath, scrubSeconds, studio, pngWatchFolder, title, jobId } = params
  const baseName = path.basename(mxfPath, path.extname(mxfPath))
  const tmpPng = path.join(os.tmpdir(), `${baseName}_${Date.now()}.png`)
  let currentStep = null

  try {
    // Step 1: Extract frame
    currentStep = 'extracting'
    onProgress({ step: 'extracting', message: 'Extracting frame...' })
    const base64 = await extractFrame(mxfPath, scrubSeconds)
    const pngData = Buffer.from(base64.replace('data:image/png;base64,', ''), 'base64')
    await fs.writeFile(tmpPng, pngData)

    // Step 2: Write XMP metadata
    currentStep = 'writing-metadata'
    onProgress({ step: 'writing-metadata', message: 'Writing metadata...' })
    await writeXmpMetadata(tmpPng, { title, description: jobId })

    // Step 3: Copy MXF
    currentStep = 'copying-mxf'
    onProgress({ step: 'copying-mxf', message: `Sending MXF to ${studio.name}...` })
    const mxfDest = studio.uncPath.startsWith('\\\\')
      ? studio.uncPath + `${baseName}.mxf`
      : path.join(studio.uncPath, `${baseName}.mxf`)
    await copyFile(mxfPath, mxfDest)

    // Step 4: Copy PNG
    currentStep = 'copying-png'
    onProgress({ step: 'copying-png', message: 'Sending PNG to approval folder...' })
    const pngDest = pngWatchFolder.startsWith('\\\\')
      ? pngWatchFolder + `${baseName}.png`
      : path.join(pngWatchFolder, `${baseName}.png`)
    await copyFile(tmpPng, pngDest)

    onProgress({ step: 'complete', message: 'Done!' })
  } catch (err) {
    onProgress({ step: 'error', message: err.message, failedStep: currentStep })
    throw err
  } finally {
    await fs.unlink(tmpPng).catch(() => {})
  }
}
