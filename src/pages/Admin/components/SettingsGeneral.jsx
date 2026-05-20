import { Save } from 'lucide-react'

export default function SettingsGeneral({ data, onChange, onSave, status, darkMode, ui }) {
  const { cardStyle, labelStyle, inputStyle, saveButtonStyle, renderStatus, savingBySection } = ui

  return (
    <div style={cardStyle}>
      <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', color: darkMode ? '#e2e8f0' : '#111827' }}>
        General Settings
      </h2>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={labelStyle}>Site Name</span>
          <input type="text" name="siteName" value={data.siteName} onChange={onChange} style={inputStyle} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={labelStyle}>Site Description</span>
          <textarea
            name="siteDescription"
            value={data.siteDescription}
            onChange={onChange}
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={labelStyle}>Contact Email</span>
            <input
              type="email"
              name="contactEmail"
              value={data.contactEmail}
              onChange={onChange}
              style={inputStyle}
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={labelStyle}>WhatsApp Number</span>
            <input
              type="tel"
              name="whatsappNumber"
              value={data.whatsappNumber}
              onChange={onChange}
              style={inputStyle}
            />
          </label>
        </div>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <span style={labelStyle}>Church Address</span>
          <input type="text" name="address" value={data.address} onChange={onChange} style={inputStyle} />
        </label>

        <button
          onClick={onSave}
          disabled={Boolean(savingBySection.general)}
          style={saveButtonStyle('general')}
        >
          <Save size={18} />
          {savingBySection.general ? 'Saving...' : 'Save Changes'}
        </button>
        {renderStatus('general')}
      </div>
    </div>
  )
}
