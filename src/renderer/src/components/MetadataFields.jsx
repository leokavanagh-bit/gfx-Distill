export function MetadataFields({ title, jobId, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label htmlFor="title" style={{ display: 'block', fontSize: 11, marginBottom: 4, color: '#888' }}>
          Document Title
        </label>
        <input
          id="title"
          type="text"
          value={title}
          onChange={(e) => onChange({ title: e.target.value, jobId })}
          placeholder="Optional"
          style={{ width: '100%', padding: '6px 8px', borderRadius: 4, boxSizing: 'border-box' }}
        />
      </div>
      <div>
        <label htmlFor="jobId" style={{ display: 'block', fontSize: 11, marginBottom: 4, color: '#888' }}>
          Job ID <span style={{ color: '#e94560' }}>*</span>
        </label>
        <input
          id="jobId"
          type="text"
          value={jobId}
          onChange={(e) => onChange({ title, jobId: e.target.value })}
          placeholder="e.g. 8C378D"
          style={{ width: '100%', padding: '6px 8px', borderRadius: 4, boxSizing: 'border-box' }}
        />
      </div>
    </div>
  )
}
