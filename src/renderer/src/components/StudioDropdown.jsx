export function StudioDropdown({ studios, value, onChange }) {
  const selectedIndex = value
    ? studios.findIndex((s) => s.uncPath === value.uncPath)
    : -1

  return (
    <select
      value={selectedIndex === -1 ? '' : String(selectedIndex)}
      onChange={(e) => {
        const idx = parseInt(e.target.value, 10)
        onChange(studios[idx])
      }}
      style={{ width: '100%', padding: '6px 8px', borderRadius: 4 }}
    >
      <option value="" disabled>Select studio...</option>
      {studios.map((s, i) => (
        <option key={s.uncPath} value={String(i)}>{s.name}</option>
      ))}
    </select>
  )
}
