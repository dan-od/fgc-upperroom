import { Save } from 'lucide-react'

export default function SettingsNotifications({ data, onChange, onSave, status, darkMode, ui }) {
  const { cardStyle, saveButtonStyle, renderStatus, savingBySection, subtleSurface, textPrimary, textSecondary } = ui

  return (
    <div style={cardStyle}>
      <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', color: darkMode ? '#e2e8f0' : '#111827' }}>
        Notification Settings
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem',
            padding: '1rem',
            background: subtleSurface,
            borderRadius: '0.5rem'
          }}
        >
          <input
            type="checkbox"
            name="enableScheduler"
            checked={data.enableScheduler}
            onChange={onChange}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: textPrimary }}>
              Enable WhatsApp Scheduler
            </p>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: textSecondary }}>
              Save ministry preference for reminder scheduling.
            </p>
          </div>
        </label>

        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.8rem',
            padding: '1rem',
            background: subtleSurface,
            borderRadius: '0.5rem'
          }}
        >
          <input
            type="checkbox"
            name="enableNotifications"
            checked={data.enableNotifications}
            onChange={onChange}
            style={{ width: '20px', height: '20px', cursor: 'pointer' }}
          />
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: textPrimary }}>
              Admin Notifications
            </p>
            <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: textSecondary }}>
              Enable dashboard-side notifications preference.
            </p>
          </div>
        </label>

        <button
          onClick={onSave}
          disabled={Boolean(savingBySection.notifications)}
          style={saveButtonStyle('notifications')}
        >
          <Save size={18} />
          {savingBySection.notifications ? 'Saving...' : 'Save Settings'}
        </button>
        {renderStatus('notifications')}
      </div>
    </div>
  )
}
