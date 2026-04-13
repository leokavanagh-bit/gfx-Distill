export function MetadataFields({ title, jobId, keywords, onChange }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div>
        <label htmlFor="metadata-title" style={{ display: 'block', fontSize: 11, marginBottom: 4, color: '#888' }}>
          Document Title
        </label>
        <input
          id="metadata-title"
          type="text"
          value={title}
          onChange={(e) => onChange({ title: e.target.value, jobId, keywords })}
          placeholder="Optional"
          style={{ width: '100%', padding: '6px 8px', borderRadius: 4, boxSizing: 'border-box' }}
        />
      </div>
      <div>
        <label htmlFor="metadata-jobId" style={{ display: 'block', fontSize: 11, marginBottom: 4, color: '#888' }}>
          Job ID <span style={{ color: '#e94560' }}>*</span>
        </label>
        <input
          id="metadata-jobId"
          type="text"
          value={jobId}
          onChange={(e) => onChange({ title, jobId: e.target.value, keywords })}
          placeholder="e.g. 8C378D"
          style={{ width: '100%', padding: '6px 8px', borderRadius: 4, boxSizing: 'border-box' }}
        />
      </div>
      <div>
        <label htmlFor="metadata-keywords" style={{ display: 'block', fontSize: 11, marginBottom: 4, color: '#888' }}>
          Keywords
        </label>
        <input
          id="metadata-keywords"
          type="text"
          value={keywords}
          onChange={(e) => onChange({ title, jobId, keywords: e.target.value })}
          placeholder="Comma-separated, e.g. sport, promo"
          style={{ width: '100%', padding: '6px 8px', borderRadius: 4, boxSizing: 'border-box' }}
        />
      </div>
    </div>
  )
}
