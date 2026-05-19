import { normalizeRegistrationMethods } from '../../../utils/eventsApi'

export default function EventRegistrationSetup({ formData, setFormData, darkMode, ui }) {
  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleRegistrationMethodChange = (method, field, value) => {
    setFormData((prev) => ({
      ...prev,
      registrationMethods: {
        ...normalizeRegistrationMethods(prev.registrationMethods),
        [method]: {
          ...normalizeRegistrationMethods(prev.registrationMethods)[method],
          [field]: value
        }
      }
    }))
  }

  return (
    <div style={{
      border: `1px solid ${ui.border}`,
      borderRadius: '0.75rem',
      padding: '1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '1rem',
      background: ui.panelAlt
    }}>
      <div>
        <h3 style={{ margin: 0, fontSize: '0.95rem', color: ui.textPrimary }}>Registration Setup</h3>
        <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: ui.textSecondary }}>
          Configure how people can register for this event.
        </p>
      </div>

      <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: ui.textMuted }}>Fallback Registration Link</span>
        <input
          type="url"
          name="registrationLink"
          value={formData.registrationLink || '/contact'}
          onChange={handleChange}
          placeholder="/contact or https://..."
          style={{ padding: '0.7rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', fontSize: '0.9rem' }}
        />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
        <div style={{ border: `1px solid ${ui.border}`, borderRadius: '0.6rem', padding: '0.85rem', background: ui.panel }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input
              type="checkbox"
              checked={Boolean(formData.registrationMethods?.whatsapp?.enabled)}
              onChange={(e) => handleRegistrationMethodChange('whatsapp', 'enabled', e.target.checked)}
            />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: ui.textMuted }}>WhatsApp Registration</span>
          </label>
          {formData.registrationMethods?.whatsapp?.enabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              <input
                type="text"
                value={formData.registrationMethods?.whatsapp?.label || ''}
                onChange={(e) => handleRegistrationMethodChange('whatsapp', 'label', e.target.value)}
                placeholder="Button label"
                style={{ padding: '0.65rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.45rem', fontSize: '0.85rem' }}
              />
              <input
                type="tel"
                value={formData.registrationMethods?.whatsapp?.phone || ''}
                onChange={(e) => handleRegistrationMethodChange('whatsapp', 'phone', e.target.value)}
                placeholder="WhatsApp number e.g. +2347031526399"
                style={{ padding: '0.65rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.45rem', fontSize: '0.85rem' }}
              />
            </div>
          )}
        </div>

        <div style={{ border: `1px solid ${ui.border}`, borderRadius: '0.6rem', padding: '0.85rem', background: ui.panel }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <input
              type="checkbox"
              checked={Boolean(formData.registrationMethods?.payment?.enabled)}
              onChange={(e) => handleRegistrationMethodChange('payment', 'enabled', e.target.checked)}
            />
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: ui.textMuted }}>Payment Registration</span>
          </label>
          {formData.registrationMethods?.payment?.enabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              <input
                type="text"
                value={formData.registrationMethods?.payment?.label || ''}
                onChange={(e) => handleRegistrationMethodChange('payment', 'label', e.target.value)}
                placeholder="Button label"
                style={{ padding: '0.65rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.45rem', fontSize: '0.85rem' }}
              />
              <input
                type="url"
                value={formData.registrationMethods?.payment?.url || ''}
                onChange={(e) => handleRegistrationMethodChange('payment', 'url', e.target.value)}
                placeholder="https://payment-link.example"
                style={{ padding: '0.65rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.45rem', fontSize: '0.85rem' }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
