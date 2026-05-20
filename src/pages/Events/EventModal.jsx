import { useState, useRef, useEffect } from 'react'
import { Button } from '../../components/common'
import { getWhatToExpectText, getRegistrationOptions } from './usePublicEvents'

const toCalendarUtcStamp = (value) =>
  value.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'

const escapeIcsText = (value) =>
  String(value || '')
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/,/g, '\\,')
    .replace(/;/g, '\\;')

const getEventDateRange = (event) => {
  const start = new Date(event.startDate)
  const timeText = String(event.time || '').toLowerCase().trim()
  const amPmMatch = timeText.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/)
  const twentyFourHourMatch = timeText.match(/\b(\d{1,2}):(\d{2})\b/)
  if (amPmMatch) {
    let hours = Number(amPmMatch[1])
    const minutes = Number(amPmMatch[2] || 0)
    const period = amPmMatch[3]
    if (period === 'pm' && hours !== 12) hours += 12
    if (period === 'am' && hours === 12) hours = 0
    start.setHours(hours, minutes, 0, 0)
  } else if (twentyFourHourMatch) {
    start.setHours(Number(twentyFourHourMatch[1]), Number(twentyFourHourMatch[2]), 0, 0)
  } else {
    start.setHours(9, 0, 0, 0)
  }
  return { start, end: new Date(start.getTime() + 2 * 60 * 60 * 1000) }
}

const buildCalendarDetails = (event) => {
  const lines = [event.description]
  if (event.organizer) lines.push(`Organizer: ${event.organizer}`)
  if (event.contact) lines.push(`Contact: ${event.contact}`)
  if (event.registrationLink) {
    const href = String(event.registrationLink).startsWith('http')
      ? event.registrationLink
      : `${window.location.origin}${String(event.registrationLink).startsWith('/') ? event.registrationLink : `/${event.registrationLink}`}`
    lines.push(`Registration: ${href}`)
  }
  return lines.filter(Boolean).join('\n\n')
}

const exportToCalendar = (event, format) => {
  const { start, end } = getEventDateRange(event)
  const startDate = toCalendarUtcStamp(start)
  const endDate = toCalendarUtcStamp(end)
  const details = buildCalendarDetails(event)
  if (format === 'google') {
    window.open(`https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(event.location)}`, '_blank')
  } else if (format === 'outlook') {
    window.open(`https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(event.title)}&startdt=${encodeURIComponent(start.toISOString())}&enddt=${encodeURIComponent(end.toISOString())}&body=${encodeURIComponent(details)}&location=${encodeURIComponent(event.location)}`, '_blank')
  } else if (format === 'ical') {
    const icalContent = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//FGC Upper Room//Events//EN', 'CALSCALE:GREGORIAN',
      'BEGIN:VEVENT',
      `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@fgcupperroom.local`,
      `DTSTAMP:${toCalendarUtcStamp(new Date())}`,
      `DTSTART:${startDate}`, `DTEND:${endDate}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
      `DESCRIPTION:${escapeIcsText(details)}`,
      `LOCATION:${escapeIcsText(event.location)}`,
      'END:VEVENT', 'END:VCALENDAR'
    ].join('\n')
    const blob = new Blob([icalContent], { type: 'text/calendar' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `${event.title.replace(/\s+/g, '-')}.ics`
    link.click()
    URL.revokeObjectURL(link.href)
  }
}

export default function EventModal({ event, onClose }) {
  const [showShareDropdown, setShowShareDropdown] = useState(false)
  const [status, setStatus] = useState('')
  const modalRef = useRef(null)
  const closeRef = useRef(null)

  useEffect(() => {
    document.body.classList.add('modal-open')
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 40)
    const handleKeydown = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const panel = modalRef.current
      if (!panel) return
      const focusable = panel.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')
      if (!focusable.length) return
      const first = focusable[0], last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKeydown)
    return () => { window.clearTimeout(focusTimer); document.body.classList.remove('modal-open'); document.removeEventListener('keydown', handleKeydown) }
  }, [onClose])

  const shareEvent = async (platform) => {
    const url = encodeURIComponent(window.location.href)
    const text = encodeURIComponent(`Check out ${event.title} at Upper Room Mgbuoba!`)
    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`
    }
    if (platform === 'copy') {
      try { await navigator.clipboard.writeText(window.location.href); setStatus('Event link copied to clipboard.') }
      catch { setStatus('Unable to copy link automatically. Please copy the URL from your browser.') }
      return
    }
    if (shareUrls[platform]) { window.open(shareUrls[platform], '_blank', 'width=600,height=400'); setStatus(`Sharing to ${platform}...`) }
  }

  const registrationOptions = getRegistrationOptions(event)

  return (
    <div className="event-modal-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="event-modal-title">
      <div ref={modalRef} className="event-modal" onClick={(e) => e.stopPropagation()}>
        <div className="event-modal__header">
          <h2 id="event-modal-title">{event.title}</h2>
          <div className="event-modal__header-actions">
            <div className="event-modal__share-dropdown-wrapper">
              <button type="button" className="event-modal__share-btn" onClick={() => setShowShareDropdown(!showShareDropdown)} title="Share event" aria-label="Share this event" aria-haspopup="menu" aria-expanded={showShareDropdown}>
                <i className="fa-solid fa-share-nodes"></i>
              </button>
              {showShareDropdown && (
                <div className="event-modal__share-dropdown" role="menu" aria-label="Share options">
                  {[['facebook', 'fa-brands fa-facebook', 'Facebook'], ['twitter', 'fa-brands fa-x-twitter', 'X (Twitter)'], ['whatsapp', 'fa-brands fa-whatsapp', 'WhatsApp']].map(([platform, icon, label]) => (
                    <button key={platform} type="button" onClick={() => { shareEvent(platform); setShowShareDropdown(false) }} className="share-dropdown-item" role="menuitem">
                      <i className={icon}></i> {label}
                    </button>
                  ))}
                  <button type="button" onClick={() => { shareEvent('copy'); setShowShareDropdown(false) }} className="share-dropdown-item share-dropdown-item--copy" role="menuitem">
                    <i className="fa-solid fa-copy"></i> Copy Link
                  </button>
                </div>
              )}
            </div>
            <button ref={closeRef} type="button" className="event-modal__close" onClick={onClose} aria-label="Close event details">
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
        <div className="event-modal__image"><img src={event.image} alt={event.title} /></div>
        <div className="event-modal__content">
          <p className="event-modal__status" aria-live="polite">{status}</p>
          <p className="event-modal__category">{event.category.split(',').map((cat, idx) => <code key={idx}>{cat.trim()}</code>)}</p>
          <div className="event-modal__details">
            <div className="event-modal__detail"><i className="fa-solid fa-calendar"></i><span>{event.date}</span></div>
            <div className="event-modal__detail"><i className="fa-solid fa-clock"></i><span>{event.time}</span></div>
            <div className="event-modal__detail"><i className="fa-solid fa-location-dot"></i><span>{event.location}</span></div>
            <div className="event-modal__detail"><i className="fa-solid fa-ticket"></i><span>{event.price}</span></div>
          </div>
          <p className="event-modal__description">{getWhatToExpectText(event)}</p>
          <div className="event-modal__organizer"><strong>Organizer:</strong> {event.organizer}</div>
          <div className="event-modal__calendar-actions">
            <button type="button" className="event-modal__calendar-btn" onClick={() => exportToCalendar(event, 'google')}><i className="fa-brands fa-google"></i> Add to Google Calendar</button>
            <button type="button" className="event-modal__calendar-btn event-modal__calendar-btn--outline" onClick={() => exportToCalendar(event, 'outlook')}><i className="fa-brands fa-microsoft"></i> Add to Outlook</button>
            <button type="button" className="event-modal__calendar-btn event-modal__calendar-btn--outline" onClick={() => exportToCalendar(event, 'ical')}><i className="fa-solid fa-download"></i> Download .ics</button>
          </div>
          <div className="event-modal__registration-actions">
            {registrationOptions.map((option, index) => (
              <Button key={`${option.label}-${index}`} href={option.href} variant={index === 0 ? 'primary' : 'outline'} size="lg" className="event-modal__register" external={option.href.startsWith('http')} target={option.href.startsWith('http') ? '_blank' : undefined} rel={option.href.startsWith('http') ? 'noopener noreferrer' : undefined}>
                {option.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
