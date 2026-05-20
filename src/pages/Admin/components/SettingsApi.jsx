import { Save } from 'lucide-react'

export default function SettingsApi({ data, onChange, onSave, status, darkMode, ui }) {
  const { cardStyle, labelStyle, inputStyle, saveButtonStyle, renderStatus, savingBySection, textSecondary } = ui

  return (
    <div style={cardStyle}>
      <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', color: darkMode ? '#e2e8f0' : '#111827' }}>
        API Keys
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={labelStyle}>YouTube API Key</span>
          <input
            type="password"
            name="youtubeApiKey"
            value={data.youtubeApiKey}
            onChange={onChange}
            placeholder="Enter YouTube Data API v3 key"
            style={inputStyle}
          />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={labelStyle}>YouTube Channel ID</span>
          <input
            type="text"
            name="youtubeChannelId"
            value={data.youtubeChannelId}
            onChange={onChange}
            placeholder="UC..."
            style={inputStyle}
          />
        </label>

        <p style={{ margin: 0, fontSize: '0.75rem', color: textSecondary }}>
          Saved locally for this browser admin workspace. Production API credentials should still be managed in environment variables.
        </p>

        <button
          onClick={onSave}
          disabled={Boolean(savingBySection.api)}
          style={saveButtonStyle('api')}
        >
          <Save size={18} />
          {savingBySection.api ? 'Saving...' : 'Save API Keys'}
        </button>
        {renderStatus('api')}
      </div>
    </div>
  )
}
