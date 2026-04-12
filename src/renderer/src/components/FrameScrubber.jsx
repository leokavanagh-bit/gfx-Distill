import { useState, useEffect, useRef } from 'react'

export function FrameScrubber({ mxfPath, onFrameChange, seekTo }) {
  const [duration, setDuration] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [frameUrl, setFrameUrl] = useState(null)
  const [loading, setLoading] = useState(false)
  // Sequence counter: incremented whenever a new extraction starts.
  // Each async job captures its own seq value; if it no longer matches
  // current on completion, the result is discarded.
  const seqRef = useRef(0)

  useEffect(() => {
    if (!mxfPath) return
    let cancelled = false
    setSeconds(0)
    setFrameUrl(null)

    window.api.ffmpeg.getDuration(mxfPath).then((d) => {
      if (cancelled) return
      setDuration(d)
      extractAt(0, mxfPath)
    })

    return () => { cancelled = true }
  }, [mxfPath])

  useEffect(() => {
    if (seekTo == null || !mxfPath) return
    setSeconds(seekTo)
    onFrameChange(seekTo)
    extractAt(seekTo, mxfPath)
  }, [seekTo])

  async function extractAt(secs, path) {
    const seq = ++seqRef.current
    setLoading(true)
    try {
      const url = await window.api.ffmpeg.extractFrame(path, secs)
      if (seq === seqRef.current) {
        setFrameUrl(url)
      }
    } finally {
      if (seq === seqRef.current) {
        setLoading(false)
      }
    }
  }

  async function handleScrub(e) {
    const secs = parseFloat(e.target.value)
    setSeconds(secs)
    onFrameChange(secs)
    await extractAt(secs, mxfPath)
  }

  if (!mxfPath) {
    return (
      <div
        data-testid="frame-placeholder"
        style={{ background: '#000', aspectRatio: '16 / 9', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#555' }}
      >
        Load an MXF file to preview frames
      </div>
    )
  }

  return (
    <div>
      <div style={{ background: '#000', borderRadius: 4, aspectRatio: '16 / 9', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        {loading && <span style={{ color: '#888' }}>Extracting...</span>}
        {frameUrl && !loading && <img src={frameUrl} alt="Frame preview" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />}
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
