import { useState } from 'react'

function getBasename(filePath) {
  return filePath.split(/[\\/]/).pop()
}

export function DropZone({ file, onFile }) {
  const [error, setError] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  function handleDrop(e) {
    e.preventDefault()
    setDragOver(false)
    const dropped = e.dataTransfer.files[0]
    if (!dropped) return
    if (!dropped.name.toLowerCase().endsWith('.mxf')) {
      setError('Only .mxf files are accepted.')
      return
    }
    setError(null)
    // webUtils.getPathForFile is the Electron 32+ replacement for the removed File.path property
    onFile(window.api.getFilePath(dropped))
  }

  async function handleBrowse() {
    const filePath = await window.api.dialog.openFile([{ name: 'MXF Files', extensions: ['mxf', 'MXF'] }])
    if (!filePath) return
    setError(null)
    onFile(filePath)
  }

  return (
    <div>
      <div
        data-testid="drop-zone"
        onDrop={handleDrop}
        onDragEnter={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        style={{
          border: `2px dashed ${dragOver ? '#e94560' : '#444'}`,
          borderRadius: 8,
          padding: 24,
          textAlign: 'center',
          cursor: 'pointer',
          background: dragOver ? 'rgba(233,69,96,0.05)' : 'transparent',
        }}
      >
        {file
          ? <p style={{ margin: 0, fontWeight: 'bold' }}>{getBasename(file)}</p>
          : <p style={{ margin: 0, color: '#888' }}>Drop MXF file here</p>
        }
        {error && <p style={{ margin: '8px 0 0', color: '#e94560', fontSize: 12 }}>{error}</p>}
      </div>
      <button
        onClick={handleBrowse}
        style={{
          marginTop: 8,
          width: '100%',
          padding: '6px',
          background: 'none',
          border: '1px solid #444',
          borderRadius: 4,
          color: '#888',
          cursor: 'pointer',
          fontSize: 12,
        }}
      >
        Browse for file…
      </button>
    </div>
  )
}
