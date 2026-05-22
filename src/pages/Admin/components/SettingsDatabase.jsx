import { Database } from 'lucide-react'

export default function SettingsDatabase({ onExport, onClearCache, status, darkMode, ui }) {
  const { cardStyle, saveButtonStyle, renderStatus, savingBySection, textPrimary } = ui

  return (
    <div style={cardStyle}>
      <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', color: darkMode ? '#e2e8f0' : '#111827' }}>
        Database Management
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div
          style={{
            padding: '1rem',
            background: '#fef3c7',
            border: '1px solid #f59e0b',
            borderRadius: '0.5rem'
          }}
        >
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#92400e' }}>
            <strong>Warning:</strong> Backup before clearing anything. These tools operate on browser-stored admin data.
          </p>
        </div>

        <button
          onClick={onExport}
          disabled={Boolean(savingBySection.database)}
          style={{ ...saveButtonStyle('database'), background: '#10b981' }}
        >
          <Database size={18} />
          {savingBySection.database ? 'Working...' : 'Export Admin Backup'}
        </button>

        <button
          onClick={onClearCache}
          disabled={Boolean(savingBySection.database)}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#6b7280',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: savingBySection.database ? 'not-allowed' : 'pointer',
            width: 'fit-content',
            opacity: savingBySection.database ? 0.7 : 1
          }}
        >
          Clear Cache
        </button>

        {renderStatus('database')}
      </div>
    </div>
  )
}
