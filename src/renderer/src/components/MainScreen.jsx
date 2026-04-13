import { useState, useEffect } from 'react'
import distillLogo from '../Distill_Logo.svg'
import { DropZone } from './DropZone.jsx'
import { StudioDropdown } from './StudioDropdown.jsx'
import { MetadataFields } from './MetadataFields.jsx'
import { FrameScrubber } from './FrameScrubber.jsx'
import { SendArea } from './SendArea.jsx'
import { VettingBanner } from './VettingBanner.jsx'
import { useConfig } from '../hooks/useConfig.js'

export function MainScreen() {
  const { config, loading } = useConfig()
  const [mxfPath, setMxfPath] = useState(null)
  const [studio, setStudio] = useState(null)
  const [scrubSeconds, setScrubSeconds] = useState(0)
  const [title, setTitle] = useState('')
  const [jobId, setJobId] = useState('')
  const [keywords, setKeywords] = useState('')

  // vettingResult: null | 'scanning' | VettingResult
  const [vettingResult, setVettingResult] = useState(null)
  const [vettingDismissed, setVettingDismissed] = useState(false)
  const [seekTo, setSeekTo] = useState(null)

  useEffect(() => {
    if (!mxfPath) {
      setVettingResult(null)
      setVettingDismissed(false)
      return
    }
    let stale = false
    setVettingResult('scanning')
    setVettingDismissed(false)
    setSeekTo(null)
    window.api.vet.scan(mxfPath)
      .then((result) => { if (!stale) setVettingResult(result) })
      .catch(() => { if (!stale) setVettingResult({ status: 'error', flags: [], error: 'scan failed' }) })
    return () => { stale = true }
  }, [mxfPath])

  if (loading) return <div style={{ padding: 24, color: '#888' }}>Loading config...</div>

  const sendParams = {
    mxfPath,
    scrubSeconds,
    studio,
    pngWatchFolder: config.pngWatchFolder,
    title,
    jobId,
    keywords,
  }

  const bannerStatus =
    vettingResult === null ? null
    : vettingResult === 'scanning' ? 'scanning'
    : vettingResult.status

  const bannerFlags = vettingResult && vettingResult !== 'scanning' ? vettingResult.flags : []

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        boxSizing: 'border-box',
        overflow: 'hidden',
        background: '#231f20',
      }}
    >
      {/* Header */}
      <div style={{ padding: '10px 20px 0' }}>
        <img src={distillLogo} alt="Distill" style={{ height: 28 }} />
      </div>

      {/* Two-column content area */}
      <div style={{ display: 'flex', gap: 20, padding: 20, flex: 1, overflow: 'hidden' }}>
        {/* Left column */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <DropZone file={mxfPath} onFile={setMxfPath} />
          <div>
            <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>
              Studio Destination
            </label>
            <StudioDropdown studios={config.studios} value={studio} onChange={setStudio} />
          </div>
          <MetadataFields
            title={title}
            jobId={jobId}
            keywords={keywords}
            onChange={({ title: t, jobId: j, keywords: k }) => {
              setTitle(t)
              setJobId(j)
              setKeywords(k)
            }}
          />
        </div>

        {/* Right column */}
        <div style={{ flex: 1.4, display: 'flex', flexDirection: 'column' }}>
          <FrameScrubber mxfPath={mxfPath} onFrameChange={setScrubSeconds} seekTo={seekTo} />
          <div style={{ marginTop: 'auto', paddingTop: 16 }}>
            <SendArea params={sendParams} />
          </div>
        </div>
      </div>

      {/* Vetting banner — full width, below both columns, always rendered to hold space */}
      <VettingBanner
        status={vettingDismissed ? null : bannerStatus}
        flags={bannerFlags}
        onTimecodeSelect={(t) => setSeekTo(t)}
        onDismiss={() => setVettingDismissed(true)}
      />
    </div>
  )
}
