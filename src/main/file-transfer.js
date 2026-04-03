import fs from 'fs/promises'
import path from 'path'

/**
 * Copies srcPath to destPath, creating the destination directory first.
 * Handles both POSIX paths (/Volumes/studio/file.mxf) and Windows UNC paths
 * (\\server\share\file.mxf) by detecting UNC paths via the \\\\ prefix and
 * routing them through path.win32.dirname.
 */
export async function copyFile(srcPath, destPath) {
  const destDir = destPath.startsWith('\\\\')
    ? path.win32.dirname(destPath)
    : path.dirname(destPath)
  await fs.mkdir(destDir, { recursive: true })
  await fs.copyFile(srcPath, destPath)
}
