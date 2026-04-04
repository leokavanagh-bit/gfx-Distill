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
    // dropped.path is an Electron-specific extension to the File API — not available in browsers
    onFile(dropped.path)
  }

  return (
    <div
      data-testid="drop-zone"
      onDrop={handleDrop}
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
  )
}
