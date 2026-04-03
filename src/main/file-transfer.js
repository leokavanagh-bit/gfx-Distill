import fs from 'fs/promises'
import path from 'path'

export async function copyFile(srcPath, destPath) {
  const rawDir = destPath.includes('\\')
    ? path.win32.dirname(destPath)
    : path.dirname(destPath)
  const destDir = rawDir.replace(/\\+$/, '')
  await fs.mkdir(destDir, { recursive: true })
  await fs.copyFile(srcPath, destPath)
}
