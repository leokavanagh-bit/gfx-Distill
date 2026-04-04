import { useSend } from '../hooks/useSend.js'

function isReady(params) {
  return !!(params.mxfPath && params.studio && params.jobId)
}

export function SendArea({ params }) {
  const { status, progressMessage, error, execute } = useSend()

  if (status === 'sending') {
    return (
      <div>
        <div style={{ background: '#222', borderRadius: 4, height: 8, overflow: 'hidden' }}>
          <div style={{ background: '#e94560', height: '100%', width: '60%', transition: 'width 0.3s' }} />
        </div>
        <p style={{ fontSize: 12, color: '#888', marginTop: 6 }}>{progressMessage}</p>
      </div>
    )
  }

  if (status === 'complete') {
    return <p style={{ color: '#4caf50', fontWeight: 'bold' }}>Sent successfully!</p>
  }

  return (
    <div>
      {error && (
        <div style={{ background: 'rgba(233,69,96,0.15)', border: '1px solid #e94560', borderRadius: 4, padding: '8px 12px', marginBottom: 10 }}>
          <p style={{ margin: 0, color: '#e94560', fontSize: 13 }}>{error}</p>
          <button
            onClick={() => execute(params)}
            style={{ marginTop: 6, padding: '4px 12px', background: '#e94560', color: 'white', border: 'none', borderRadius: 3, cursor: 'pointer' }}
          >
            Retry
          </button>
        </div>
      )}
      <button
        onClick={() => execute(params)}
        disabled={!isReady(params)}
        style={{
          width: '100%',
          padding: '10px',
          background: isReady(params) ? '#e94560' : '#444',
          color: 'white',
          border: 'none',
          borderRadius: 4,
          fontWeight: 'bold',
          cursor: isReady(params) ? 'pointer' : 'not-allowed',
          fontSize: 14,
        }}
      >
        Send
      </button>
    </div>
  )
}
