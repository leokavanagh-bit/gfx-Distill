import { ExifTool } from 'exiftool-vendored'

export async function writeXmpMetadata(pngPath, { title, description }) {
  const et = new ExifTool({ taskTimeoutMillis: 10000 })
  try {
    await et.write(
      pngPath,
      { 'XMP-dc:Title': title, 'XMP-dc:Description': description },
      ['-overwrite_original']
    )
  } finally {
    await et.end()
  }
}
