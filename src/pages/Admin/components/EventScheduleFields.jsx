export default function EventScheduleFields({ formData, handleChange, ui }) {
  const fieldStyle = { padding: '0.75rem', border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', fontSize: '1rem' }
  const labelStyle = { fontSize: '0.875rem', fontWeight: 600, color: ui.textMuted }
  const colStyle = { display: 'flex', flexDirection: 'column', gap: '0.5rem' }

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
        <div style={colStyle}>
          <label style={labelStyle}>Date *</label>
          <input type="date" name="date" value={formData.date} onChange={handleChange} required style={fieldStyle} />
        </div>
        <div style={colStyle}>
          <label style={labelStyle}>Time *</label>
          <input type="time" name="time" value={formData.time} onChange={handleChange} required style={fieldStyle} />
        </div>
        <div style={colStyle}>
          <label style={labelStyle}>Capacity</label>
          <input type="number" name="capacity" value={formData.capacity} onChange={handleChange} style={fieldStyle} placeholder="Max attendees" />
        </div>
      </div>

      {formData.status === 'scheduled' && (
        <div style={colStyle}>
          <label style={labelStyle}>Scheduled Publish Time</label>
          <input type="datetime-local" name="scheduledPublishAt"
            value={formData.scheduledPublishAt ? String(formData.scheduledPublishAt).slice(0, 16) : ''}
            onChange={handleChange}
            style={fieldStyle} />
        </div>
      )}
    </>
  )
}
