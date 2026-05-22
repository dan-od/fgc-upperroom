export default function VisitorTable({ visitors, filteredVisitors, isLoading, selectedVisitors, setSelectedVisitors, darkMode, ui }) {
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedVisitors(filteredVisitors.map((visitor) => String(visitor.id)))
      return
    }
    setSelectedVisitors([])
  }

  const handleSelectVisitor = (id) => {
    const resolvedId = String(id)
    setSelectedVisitors((prev) => (
      prev.includes(resolvedId) ? prev.filter((item) => item !== resolvedId) : [...prev, resolvedId]
    ))
  }

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: `2px solid ${ui.border}` }}>
              <th style={{ padding: '0.75rem', textAlign: 'left' }}>
                <input
                  type="checkbox"
                  onChange={handleSelectAll}
                  checked={selectedVisitors.length > 0 && selectedVisitors.length === filteredVisitors.length}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: ui.textSecondary, textTransform: 'uppercase' }}>S/N</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: ui.textSecondary, textTransform: 'uppercase' }}>Name</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: ui.textSecondary, textTransform: 'uppercase' }}>Phone</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: ui.textSecondary, textTransform: 'uppercase' }}>Email</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: ui.textSecondary, textTransform: 'uppercase' }}>First Visit</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: ui.textSecondary, textTransform: 'uppercase' }}>Status</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: ui.textSecondary, textTransform: 'uppercase' }}>Tags</th>
              <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: ui.textSecondary, textTransform: 'uppercase' }}>Last Contact</th>
            </tr>
          </thead>
          <tbody>
            {!isLoading && filteredVisitors.length === 0 && (
              <tr>
                <td colSpan={9} style={{ padding: '1.5rem', textAlign: 'center', color: ui.textSecondary }}>
                  No visitors match your current filters.
                </td>
              </tr>
            )}

            {isLoading && (
              <tr>
                <td colSpan={9} style={{ padding: '1.5rem', textAlign: 'center', color: ui.textSecondary }}>
                  Loading visitors...
                </td>
              </tr>
            )}

            {!isLoading && filteredVisitors.map((visitor, index) => (
              <tr key={visitor.id} style={{ borderBottom: `1px solid ${ui.border}` }}>
                <td style={{ padding: '1rem' }}>
                  <input
                    type="checkbox"
                    checked={selectedVisitors.includes(String(visitor.id))}
                    onChange={() => handleSelectVisitor(visitor.id)}
                    style={{ cursor: 'pointer' }}
                  />
                </td>
                <td style={{ padding: '1rem', fontSize: '0.82rem', fontWeight: 700, color: ui.textSecondary }}>
                  {index + 1}
                </td>
                <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 500, color: ui.textPrimary }}>
                  {visitor.name}
                </td>
                <td style={{ padding: '1rem', fontSize: '0.875rem', color: ui.textSecondary }}>
                  {visitor.phone}
                </td>
                <td style={{ padding: '1rem', fontSize: '0.875rem', color: ui.textSecondary }}>
                  {visitor.email || 'No email'}
                </td>
                <td style={{ padding: '1rem', fontSize: '0.875rem', color: ui.textSecondary }}>
                  {visitor.firstVisit || 'Unknown'}
                </td>
                <td style={{ padding: '1rem' }}>
                  <span style={{ padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: 600, background: visitor.subscribed ? '#d1fae5' : '#fee2e2', color: visitor.subscribed ? '#065f46' : '#991b1b' }}>
                    {visitor.subscribed ? 'Subscribed' : 'Unsubscribed'}
                  </span>
                </td>
                <td style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                    {(visitor.tags || []).length > 0
                      ? visitor.tags.map((tag) => (
                          <span
                            key={`${visitor.id}-${tag}`}
                            style={{ padding: '0.125rem 0.5rem', borderRadius: '0.25rem', fontSize: '0.75rem', background: ui.panelSubtle, color: ui.textMuted }}
                          >
                            {tag}
                          </span>
                        ))
                      : <span style={{ fontSize: '0.75rem', color: ui.textFaint }}>No tags</span>}
                  </div>
                </td>
                <td style={{ padding: '1rem', fontSize: '0.875rem', color: ui.textSecondary }}>
                  {visitor.lastContact || 'Never'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: ui.textSecondary, textAlign: 'center' }}>
        Showing {filteredVisitors.length} of {visitors.length} visitors
      </div>
    </>
  )
}
