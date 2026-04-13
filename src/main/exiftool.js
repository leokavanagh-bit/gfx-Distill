import { ExifTool } from 'exiftool-vendored'

export async function writeXmpMetadata(pngPath, { title, description, keywords }) {
  const et = new ExifTool({ taskTimeoutMillis: 10000 })
  const keywordList = keywords
    ? keywords.split(',').map((k) => k.trim()).filter(Boolean)
    : []
  try {
    await et.write(
      pngPath,
      { 'XMP-dc:Title': title, 'XMP-dc:Description': description, 'XMP-dc:Subject': keywordList },
      ['-overwrite_original']
    )
  } finally {
    await et.end()
  }
}
