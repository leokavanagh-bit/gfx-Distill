import ffmpeg from 'fluent-ffmpeg'
import ffmpegStatic from 'ffmpeg-static'
import ffprobeStatic from 'ffprobe-static'
import fs from 'fs/promises'
import os from 'os'
import path from 'path'
import { app } from 'electron'

const ffmpegBin = app.isPackaged
  ? path.join(process.resourcesPath, 'ffmpeg', process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
  : ffmpegStatic

const ffprobeBin = app.isPackaged
  ? path.join(process.resourcesPath, 'ffmpeg', process.platform === 'win32' ? 'ffprobe.exe' : 'ffprobe')
  : ffprobeStatic.path

ffmpeg.setFfmpegPath(ffmpegBin)
ffmpeg.setFfprobePath(ffprobeBin)

export function getDuration(inputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(inputPath, (err, metadata) => {
      if (err) return reject(err)
      resolve(metadata.format.duration)
    })
  })
}

export function extractFrame(inputPath, seconds) {
  return new Promise((resolve, reject) => {
    const tmpFile = path.join(os.tmpdir(), `gfx_frame_${Date.now()}.png`)
    ffmpeg(inputPath)
      .seekInput(seconds)
      .frames(1)
      .output(tmpFile)
      .on('end', async () => {
        try {
          const data = await fs.readFile(tmpFile)
          resolve(`data:image/png;base64,${data.toString('base64')}`)
        } catch (e) {
          reject(e)
        } finally {
          await fs.unlink(tmpFile).catch(() => {})
        }
      })
      .on('error', async (err) => {
        await fs.unlink(tmpFile).catch(() => {})
        reject(err)
      })
      .run()
  })
}
