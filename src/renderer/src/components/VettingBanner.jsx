function formatTimecode(seconds) {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function VettingBanner({ status, flags, onTimecodeSelect, onDismiss }) {
  if (!status) return null

  const base = {
    borderTop: '1px solid',
    padding: '10px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#1a1a2e',
    flexShrink: 0,
  }

  if (status === 'scanning') {
    return (
      <div style={{ ...base, borderTopColor: '#333' }}>
        <div
          data-testid="scanning-spinner"
          style={{
            width: 12,
            height: 12,
            border: '2px solid #666',
            borderTopColor: '#e94560',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
            flexShrink: 0,
          }}
        />
        <span style={{ color: '#888', fontSize: 13 }}>Scanning for typos…</span>
      </div>
    )
  }

  if (status === 'clean') {
    return (
      <div style={{ ...base, borderTopColor: '#1e4d2b' }}>
        <span style={{ color: '#4caf50', fontSize: 13 }}>✓ No issues found</span>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div style={{ ...base, borderTopColor: '#333' }}>
        <span style={{ color: '#666', fontSize: 13 }}>
          Could not scan video — check manually before sending
        </span>
      </div>
    )
  }

  // warnings
  return (
    <div style={{ ...base, borderTopColor: '#e94560', flexWrap: 'wrap', gap: 16 }}>
      <span
        style={{ color: '#e94560', fontSize: 13, fontWeight: 'bold', whiteSpace: 'nowrap', flexShrink: 0 }}
      >
        {`⚠ ${flags.length} possible typo${flags.length === 1 ? '' : 's'}`}
      </span>
      <div style={{ display: 'flex', gap: 12, flex: 1, flexWrap: 'wrap' }}>
        {flags.map(({ word, timecode }) => (
          <button
            key={`${word}:${timecode}`}
            onClick={() => onTimecodeSelect(timecode)}
            style={{
              background: 'rgba(233,69,96,0.15)',
              border: '1px solid rgba(233,69,96,0.4)',
              borderRadius: 3,
              padding: '2px 8px',
              fontSize: 12,
              color: '#ccc',
              cursor: 'pointer',
            }}
          >
            "{word}" <span style={{ color: '#666' }}>{formatTimecode(timecode)}</span>
          </button>
        ))}
      </div>
      <button
        onClick={onDismiss}
        style={{
          background: 'none',
          border: '1px solid #444',
          borderRadius: 3,
          color: '#666',
          fontSize: 12,
          padding: '3px 10px',
          cursor: 'pointer',
          whiteSpace: 'nowrap',
          flexShrink: 0,
        }}
      >
        Dismiss
      </button>
    </div>
  )
}
