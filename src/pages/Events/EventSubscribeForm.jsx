import { useState } from 'react'
import { Button, DropdownSelect } from '../../components/common'
import { subscribeVisitor } from '../../utils/subscribeApi'

export default function EventSubscribeForm({ upcomingEvents }) {
  const reminderPreferenceEvents = upcomingEvents.filter(e => Boolean(e?.id)).slice(0, 8)
  const [subForm, setSubForm] = useState({ name: '', phone: '', email: '' })
  const [subSubmitting, setSubSubmitting] = useState(false)
  const [subStatus, setSubStatus] = useState(null)
  const [subMessage, setSubMessage] = useState('')
  const [subReminderFrequency, setSubReminderFrequency] = useState('weekly')
  const [subReminderScope, setSubReminderScope] = useState('all')
  const [subReminderEventIds, setSubReminderEventIds] = useState([])

  const validateSub = () => {
    const { name, phone, email } = subForm
    if (!name.trim() || !phone.trim() || !email.trim()) return 'Please fill in your name, phone number, and email.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Enter a valid email address.'
    if (phone.replace(/\D/g, '').length < 10) return 'Enter a valid WhatsApp phone number.'
    return null
  }

  const handleSubSubmit = async (e) => {
    e.preventDefault()
    setSubStatus(null)
    const err = validateSub()
    if (err) { setSubMessage(err); setSubStatus('error'); return }
    if (subReminderScope === 'selected' && reminderPreferenceEvents.length > 0 && subReminderEventIds.length === 0) {
      setSubMessage('Select at least one event or switch to "All upcoming events".'); setSubStatus('error'); return
    }
    setSubSubmitting(true)
    try {
      const result = await subscribeVisitor({ name: subForm.name.trim(), phone: subForm.phone.trim(), email: subForm.email.trim(), reminderPreferences: { serviceReminders: true, eventReminders: true, eventReminderFrequency: subReminderFrequency, eventIds: subReminderScope === 'selected' ? subReminderEventIds : [] } })
      setSubMessage(result.message); setSubStatus(result.ok ? 'success' : 'error')
      if (result.ok) { setSubForm({ name: '', phone: '', email: '' }); setSubReminderFrequency('weekly'); setSubReminderScope('all'); setSubReminderEventIds([]) }
    } catch { setSubStatus('error'); setSubMessage('Subscription failed. Please try again in a moment.') }
    finally { setSubSubmitting(false) }
  }

  const handleReminderScopeChange = (scope) => { setSubReminderScope(scope); if (scope === 'all') setSubReminderEventIds([]) }
  const handleReminderEventToggle = (eventId, isChecked) => {
    const id = String(eventId || '').trim()
    if (!id) return
    setSubReminderEventIds(cur => isChecked ? (cur.includes(id) ? cur : [...cur, id]) : cur.filter(x => x !== id))
  }

  return (
    <section className="event-newsletter">
      <div className="container">
        <div className="event-newsletter__content">
          <div className="event-newsletter__text">
            <h2>Never Miss an Event</h2>
            <p>Subscribe for WhatsApp reminders about upcoming programs, early registrations, and exclusive updates.</p>
          </div>
          {subStatus === 'success' ? (
            <div className="event-newsletter__success"><i className="fa-solid fa-circle-check"></i><p>{subMessage}</p></div>
          ) : (
            <form className="event-newsletter__form event-newsletter__form--full" onSubmit={handleSubSubmit}>
              {subStatus === 'error' && <p className="event-newsletter__error">{subMessage}</p>}
              <input type="text" name="name" placeholder="Your Full Name" className="event-newsletter__input" value={subForm.name} onChange={e => setSubForm(p => ({ ...p, name: e.target.value }))} autoComplete="name" required disabled={subSubmitting} />
              <input type="tel" name="phone" placeholder="WhatsApp Number (e.g., +234 8123456789)" className="event-newsletter__input" value={subForm.phone} onChange={e => setSubForm(p => ({ ...p, phone: e.target.value }))} inputMode="tel" autoComplete="tel" required disabled={subSubmitting} />
              <input type="email" name="email" placeholder="Your Email Address" className="event-newsletter__input" value={subForm.email} onChange={e => setSubForm(p => ({ ...p, email: e.target.value }))} autoComplete="email" required disabled={subSubmitting} />
              <fieldset className="event-newsletter__preferences">
                <legend className="event-newsletter__preferences-title">Reminder Preferences</legend>
                <label className="event-newsletter__preferences-label" htmlFor="event-reminder-frequency">How often should we remind you?</label>
                <DropdownSelect id="event-reminder-frequency" className="event-newsletter__select" value={subReminderFrequency} onChange={e => setSubReminderFrequency(e.target.value)} disabled={subSubmitting}>
                  <option value="daily">Daily (closer countdown updates)</option>
                  <option value="weekly">Weekly (recommended)</option>
                  <option value="key-dates">Key dates only (30/14/7/3/1 days)</option>
                </DropdownSelect>
                <div className="event-newsletter__scope">
                  {[['all', 'All upcoming events'], ['selected', 'Only selected events']].map(([val, label]) => (
                    <label key={val} className="event-newsletter__scope-option">
                      <input type="radio" name="event-reminder-scope" value={val} checked={subReminderScope === val} onChange={() => handleReminderScopeChange(val)} disabled={subSubmitting || (val === 'selected' && reminderPreferenceEvents.length === 0)} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                {subReminderScope === 'selected' && (
                  reminderPreferenceEvents.length > 0 ? (
                    <div className="event-newsletter__event-picks">
                      {reminderPreferenceEvents.map(item => {
                        const id = String(item.id || '')
                        return (
                          <label key={id} className="event-newsletter__event-option">
                            <input type="checkbox" checked={subReminderEventIds.includes(id)} onChange={e => handleReminderEventToggle(id, e.target.checked)} disabled={subSubmitting} />
                            <span>{item.title}<small>{item.date}</small></span>
                          </label>
                        )
                      })}
                    </div>
                  ) : <p className="event-newsletter__hint">No upcoming events available yet for specific selection.</p>
                )}
              </fieldset>
              <Button type="submit" variant="white" size="lg" disabled={subSubmitting}>{subSubmitting ? 'Subscribing…' : 'Subscribe'}</Button>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
