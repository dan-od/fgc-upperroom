import { useState } from 'react'
import { Send } from 'lucide-react'
import { previewBotServiceReminder } from '../../../utils/botApi'
import { formatDateTime } from '../../../utils/adminFormatters'

export default function ServiceReminderPanel({ darkMode, ui }) {
  const { surface, panel, border, text, subtext } = ui

  const [form, setForm] = useState({ name: '', serviceTime: '08:00', isFirstSunday: false })
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const generatePreview = async () => {
    setLoading(true)
    setError('')
    try {
      const payload = await previewBotServiceReminder(form)
      setPreview(payload)
    } catch (err) {
      setError(err?.message || 'Unable to generate service reminder preview.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <article style={{ border: `1px solid ${border}`, borderRadius: '0.85rem', background: surface, padding: '1rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', color: text }}>
        <Send size={16} />
        <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Service Reminder Preview</h2>
      </div>

      <div style={{ display: 'grid', gap: '0.8rem' }}>
        <label style={{ display: 'grid', gap: '0.35rem', color: subtext, fontSize: '0.82rem' }}>
          Recipient name
          <input
            type="text"
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            placeholder="Ada Obi"
            style={{ border: `1px solid ${border}`, borderRadius: '0.55rem', padding: '0.7rem', background: panel, color: text }}
          />
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
          <label style={{ display: 'grid', gap: '0.35rem', color: subtext, fontSize: '0.82rem' }}>
            Service time
            <input
              type="time"
              value={form.serviceTime}
              onChange={(event) => setForm((prev) => ({ ...prev, serviceTime: event.target.value }))}
              style={{ border: `1px solid ${border}`, borderRadius: '0.55rem', padding: '0.7rem', background: panel, color: text }}
            />
          </label>

          <label style={{ display: 'flex', alignItems: 'end', gap: '0.5rem', color: subtext, fontSize: '0.82rem' }}>
            <input
              type="checkbox"
              checked={form.isFirstSunday}
              onChange={(event) => setForm((prev) => ({ ...prev, isFirstSunday: event.target.checked }))}
            />
            First Sunday
          </label>
        </div>

        <button
          type="button"
          onClick={() => void generatePreview()}
          disabled={loading}
          style={{
            border: '0',
            borderRadius: '0.65rem',
            background: '#0f172a',
            color: '#f8fafc',
            padding: '0.8rem 1rem',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.45rem',
            fontWeight: 700,
            cursor: 'pointer',
            opacity: loading ? 0.75 : 1
          }}
        >
          <Send size={15} />
          {loading ? 'Generating...' : 'Generate preview'}
        </button>

        {error ? (
          <div style={{ border: '1px solid #fca5a5', borderRadius: '0.65rem', background: '#fef2f2', color: '#991b1b', padding: '0.8rem' }}>
            {error}
          </div>
        ) : null}

        {preview ? (
          <div style={{ border: `1px solid ${border}`, borderRadius: '0.75rem', background: panel, padding: '0.9rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.6rem' }}>
              <strong style={{ color: text }}>Generated message</strong>
              <span style={{ color: subtext, fontSize: '0.82rem' }}>{formatDateTime(preview.timestamp)}</span>
            </div>
            <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6, color: text }}>{preview.generatedMessage}</p>
          </div>
        ) : null}
      </div>
    </article>
  )
}
