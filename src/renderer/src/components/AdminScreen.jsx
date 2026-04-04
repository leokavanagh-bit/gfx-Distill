import { useState, useEffect } from 'react'

export function AdminScreen() {
  const [config, setConfig] = useState({ pngWatchFolder: '', studios: [] })
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [studioName, setStudioName] = useState('')
  const [uncPath, setUncPath] = useState('')

  useEffect(() => {
    window.api.config.load().then(setConfig)
  }, [])

  function selectStudio(idx) {
    setSelectedIndex(idx)
    setStudioName(config.studios[idx].name)
    setUncPath(config.studios[idx].uncPath)
  }

  async function saveStudio() {
    const updated = {
      ...config,
      studios: config.studios.map((s, i) =>
        i === selectedIndex ? { name: studioName, uncPath } : s
      )
    }
    await window.api.config.save(updated)
    setConfig(updated)
  }

  async function browsePngFolder() {
    const folder = await window.api.dialog.openFolder()
    if (!folder) return
    const updated = { ...config, pngWatchFolder: folder }
    await window.api.config.save(updated)
    setConfig(updated)
  }

  async function handleExport() {
    await window.api.config.exportConfig()
  }

  async function handleImport() {
    const newConfig = await window.api.config.importConfig()
    if (newConfig) setConfig(newConfig)
  }

  const inputStyle = { width: '100%', padding: '6px 8px', borderRadius: 4, boxSizing: 'border-box', marginTop: 4 }
  const labelStyle = { display: 'block', fontSize: 11, color: '#888' }
  const btnStyle = (primary) => ({
    padding: '7px 14px', borderRadius: 4, border: 'none', cursor: 'pointer',
    background: primary ? '#e94560' : '#444', color: 'white', fontWeight: primary ? 'bold' : 'normal'
  })

  return (
    <div style={{ padding: 24, maxWidth: 560 }}>
      <h2 style={{ margin: '0 0 20px' }}>Admin Settings</h2>

      <div style={{ marginBottom: 20 }}>
        <label style={labelStyle}>PNG Watch Folder</label>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <input type="text" value={config.pngWatchFolder} readOnly style={{ ...inputStyle, marginTop: 0, flex: 1 }} />
          <button onClick={browsePngFolder} style={btnStyle(false)}>Browse</button>
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={labelStyle}>Edit Studio</label>
        <select
          data-testid="studio-select"
          value={selectedIndex === -1 ? '' : selectedIndex}
          onChange={(e) => {
            const idx = parseInt(e.target.value, 10)
            if (!Number.isFinite(idx)) return
            selectStudio(idx)
          }}
          style={{ ...inputStyle, marginTop: 4 }}
        >
          <option value="" disabled>Select a studio to edit...</option>
          {config.studios.map((s, i) => <option key={i} value={i}>{s.name}</option>)}
        </select>
      </div>

      {selectedIndex >= 0 && (
        <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label htmlFor="admin-studio-name" style={labelStyle}>Studio Name</label>
            <input id="admin-studio-name" type="text" value={studioName} onChange={(e) => setStudioName(e.target.value)} style={inputStyle} />
          </div>
          <div>
            <label htmlFor="admin-unc-path" style={labelStyle}>UNC Path</label>
            <input id="admin-unc-path" type="text" value={uncPath} onChange={(e) => setUncPath(e.target.value)} style={inputStyle} />
          </div>
          <button onClick={saveStudio} style={btnStyle(true)}>Save Studio</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
        <button onClick={handleImport} style={btnStyle(false)}>Load from File</button>
        <button onClick={handleExport} style={btnStyle(false)}>Export Config</button>
      </div>
    </div>
  )
}
