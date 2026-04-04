import { useState } from 'react'
import { DropZone } from './DropZone.jsx'
import { StudioDropdown } from './StudioDropdown.jsx'
import { MetadataFields } from './MetadataFields.jsx'
import { FrameScrubber } from './FrameScrubber.jsx'
import { SendArea } from './SendArea.jsx'
import { useConfig } from '../hooks/useConfig.js'

export function MainScreen() {
  const { config, loading } = useConfig()
  const [mxfPath, setMxfPath] = useState(null)
  const [studio, setStudio] = useState(null)
  const [scrubSeconds, setScrubSeconds] = useState(0)
  const [title, setTitle] = useState('')
  const [jobId, setJobId] = useState('')

  if (loading) return <div style={{ padding: 24, color: '#888' }}>Loading config...</div>

  const sendParams = {
    mxfPath,
    scrubSeconds,
    studio,
    pngWatchFolder: config.pngWatchFolder,
    title,
    jobId,
  }

  return (
    <div style={{ display: 'flex', gap: 20, padding: 20, height: '100vh', boxSizing: 'border-box' }}>
      {/* Left column */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <DropZone file={mxfPath} onFile={setMxfPath} />
        <div>
          <label style={{ display: 'block', fontSize: 11, color: '#888', marginBottom: 4 }}>Studio Destination</label>
          <StudioDropdown studios={config.studios} value={studio} onChange={setStudio} />
        </div>
        <MetadataFields
          title={title}
          jobId={jobId}
          onChange={({ title: t, jobId: j }) => { setTitle(t); setJobId(j) }}
        />
      </div>

      {/* Right column */}
      <div style={{ flex: 1.4, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <FrameScrubber mxfPath={mxfPath} onFrameChange={setScrubSeconds} />
        <SendArea params={sendParams} />
      </div>
    </div>
  )
}
