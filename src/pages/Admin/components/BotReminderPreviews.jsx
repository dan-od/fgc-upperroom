import { useState } from 'react'
import { Calendar, Send } from 'lucide-react'
import { previewBotEventReminder } from '../../../utils/botApi'
import { formatDateTime } from '../../../utils/adminFormatters'
import ServiceReminderPanel from './ServiceReminderPanel'

const todayIso = () => new Date().toISOString().slice(0, 10)

export default function BotReminderPreviews({ darkMode, ui }) {
  const { surface, panel, border, text, subtext } = ui

  const [eventPreviewForm, setEventPreviewForm] = useState({
    name: '',
    eventTitle: '',
    eventDate: todayIso(),
    eventTime: '09:00',
    registrationLink: ''
  })
  const [eventPreview, setEventPreview] = useState(null)
  const [eventPreviewLoading, setEventPreviewLoading] = useState(false)
  const [eventPreviewError, setEventPreviewError] = useState('')

  const generateEventPreview = async () => {
    setEventPreviewLoading(true)
    setEventPreviewError('')
    try {
      const payload = await previewBotEventReminder(eventPreviewForm)
      setEventPreview(payload)
    } catch (error) {
      setEventPreviewError(error?.message || 'Unable to generate event reminder preview.')
    } finally {
      setEventPreviewLoading(false)
    }
  }

  return (
    <section style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
      <ServiceReminderPanel darkMode={darkMode} ui={ui} />

      <article style={{ border: `1px solid ${border}`, borderRadius: '0.85rem', background: surface, padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', color: text }}>
          <Calendar size={16} />
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Event Reminder Preview</h2>
        </div>

        <div style={{ display: 'grid', gap: '0.8rem' }}>
          <label style={{ display: 'grid', gap: '0.35rem', color: subtext, fontSize: '0.82rem' }}>
            Recipient name
            <input
              type="text"
              value={eventPreviewForm.name}
              onChange={(event) => setEventPreviewForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Ada Obi"
              style={{ border: `1px solid ${border}`, borderRadius: '0.55rem', padding: '0.7rem', background: panel, color: text }}
            />
          </label>

          <label style={{ display: 'grid', gap: '0.35rem', color: subtext, fontSize: '0.82rem' }}>
            Event title
            <input
              type="text"
              value={eventPreviewForm.eventTitle}
              onChange={(event) => setEventPreviewForm((prev) => ({ ...prev, eventTitle: event.target.value }))}
              placeholder="Youth Revival Night"
              style={{ border: `1px solid ${border}`, borderRadius: '0.55rem', padding: '0.7rem', background: panel, color: text }}
            />
          </label>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <label style={{ display: 'grid', gap: '0.35rem', color: subtext, fontSize: '0.82rem' }}>
              Event date
              <input
                type="date"
                value={eventPreviewForm.eventDate}
                onChange={(event) => setEventPreviewForm((prev) => ({ ...prev, eventDate: event.target.value }))}
                style={{ border: `1px solid ${border}`, borderRadius: '0.55rem', padding: '0.7rem', background: panel, color: text }}
              />
            </label>

            <label style={{ display: 'grid', gap: '0.35rem', color: subtext, fontSize: '0.82rem' }}>
              Event time
              <input
                type="time"
                value={eventPreviewForm.eventTime}
                onChange={(event) => setEventPreviewForm((prev) => ({ ...prev, eventTime: event.target.value }))}
                style={{ border: `1px solid ${border}`, borderRadius: '0.55rem', padding: '0.7rem', background: panel, color: text }}
              />
            </label>
          </div>

          <label style={{ display: 'grid', gap: '0.35rem', color: subtext, fontSize: '0.82rem' }}>
            Registration link
            <input
              type="url"
              value={eventPreviewForm.registrationLink}
              onChange={(event) => setEventPreviewForm((prev) => ({ ...prev, registrationLink: event.target.value }))}
              placeholder="https://upperroom.example/register"
              style={{ border: `1px solid ${border}`, borderRadius: '0.55rem', padding: '0.7rem', background: panel, color: text }}
            />
          </label>

          <button
            type="button"
            onClick={() => void generateEventPreview()}
            disabled={eventPreviewLoading}
            style={{
              border: '0',
              borderRadius: '0.65rem',
              background: '#1d4ed8',
              color: '#f8fafc',
              padding: '0.8rem 1rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontWeight: 700,
              cursor: 'pointer',
              opacity: eventPreviewLoading ? 0.75 : 1
            }}
          >
            <Send size={15} />
            {eventPreviewLoading ? 'Generating...' : 'Generate preview'}
          </button>

          {eventPreviewError ? (
            <div style={{ border: '1px solid #fca5a5', borderRadius: '0.65rem', background: '#fef2f2', color: '#991b1b', padding: '0.8rem' }}>
              {eventPreviewError}
            </div>
          ) : null}

          {eventPreview ? (
            <div style={{ border: `1px solid ${border}`, borderRadius: '0.75rem', background: panel, padding: '0.9rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.6rem' }}>
                <strong style={{ color: text }}>Generated message</strong>
                <span style={{ color: subtext, fontSize: '0.82rem' }}>{formatDateTime(eventPreview.timestamp)}</span>
              </div>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6, color: text }}>{eventPreview.generatedMessage}</p>
            </div>
          ) : null}
        </div>
      </article>
    </section>
  )
}
