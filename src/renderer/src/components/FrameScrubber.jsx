import { useState, useEffect } from 'react'

export function FrameScrubber({ mxfPath, onFrameChange }) {
  const [duration, setDuration] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [frameUrl, setFrameUrl] = useState(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!mxfPath) return
    setSeconds(0)
    setFrameUrl(null)
    window.api.ffmpeg.getDuration(mxfPath).then((d) => {
      setDuration(d)
      extractAt(0)
    })
  }, [mxfPath])

  async function extractAt(secs) {
    setLoading(true)
    try {
      const url = await window.api.ffmpeg.extractFrame(mxfPath, secs)
      setFrameUrl(url)
    } finally {
      setLoading(false)
    }
  }

  async function handleScrub(e) {
    const secs = parseFloat(e.target.value)
    setSeconds(secs)
    onFrameChange(secs)
    await extractAt(secs)
  }

  if (!mxfPath) {
    return (
      <div
        data-testid="frame-placeholder"
        style={{ background: '#000', height: 200, borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}
      >
        Load an MXF file to preview frames
      </div>
    )
  }

  return (
    <div>
      <div style={{ background: '#000', borderRadius: 4, minHeight: 200, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {loading && <span style={{ color: '#888' }}>Extracting...</span>}
        {frameUrl && !loading && <img src={frameUrl} alt="Frame preview" style={{ maxWidth: '100%', maxHeight: 300 }} />}
      </div>
      <input
        type="range"
        min={0}
        max={duration}
        step={0.04}
        value={seconds}
        onChange={handleScrub}
        style={{ width: '100%', marginTop: 8 }}
      />
    </div>
  )
}
