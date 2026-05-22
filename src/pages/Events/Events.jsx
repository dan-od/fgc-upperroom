import { useState, useEffect, useRef } from 'react'
import { SectionHeader, Button, DropdownSelect } from '../../components/common'
import {
  createDefaultRegistrationMethods,
  normalizeRegistrationMethods,
  fetchBotEvents,
  mapBotEventToPublicEvent
} from '../../utils/eventsApi'
import { toAssetUrl } from '../../utils/appPaths'
import './Events.css'

const DEFAULT_EVENT_IMAGE = toAssetUrl('assets/media/pictures/Senior Pastor_Home.jpeg')

const toWhatsAppLink = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}` : ''
}

const Events = () => {
  // Countdown timer for featured event
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const [contentFlipState, setContentFlipState] = useState('idle')
  
  // Grid carousel and modal state
  const [gridCarouselIndex, setGridCarouselIndex] = useState(0)
  const [selectedEventForModal, setSelectedEventForModal] = useState(null)
  const [showEventModal, setShowEventModal] = useState(false)
  const [showShareDropdown, setShowShareDropdown] = useState(false)
  const [eventModalStatus, setEventModalStatus] = useState('')
  const [isMobile, setIsMobile] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(true)
  const eventModalRef = useRef(null)
  const eventModalCloseRef = useRef(null)
  const activeModalTriggerRef = useRef(null)

  const [events, setEvents] = useState([])

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  useEffect(() => {
    const toTitleCase = (value) => {
      const text = String(value || '').trim()
      if (!text) {
        return 'General'
      }
      return text.charAt(0).toUpperCase() + text.slice(1)
    }

    const toDisplayDate = (dateObj) => {
      return dateObj.toLocaleDateString(undefined, {
        month: 'long',
        day: 'numeric',
        year: 'numeric'
      })
    }

    const normalizeAdminEvent = (item) => {
      const parsedDate = new Date(item?.date)
      const safeDate = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate

      return {
        title: String(item?.title || 'Untitled Event').trim() || 'Untitled Event',
        date: toDisplayDate(safeDate),
        startDate: safeDate,
        time: String(item?.time || 'Time TBA').trim() || 'Time TBA',
        description: String(item?.description || '').trim() || 'Details coming soon.',
        whatToExpect: Array.isArray(item?.whatToExpect)
          ? item.whatToExpect.map((tag) => String(tag || '').trim()).filter(Boolean)
          : [],
        registrationRequired: Boolean(item?.registrationRequired),
        registrationMethods: normalizeRegistrationMethods(item?.registrationMethods),
        location: String(item?.location || 'FGC Mgbuoba').trim() || 'FGC Mgbuoba',
        category: toTitleCase(item?.category || 'general'),
        price: String(item?.price || 'Free').trim() || 'Free',
        organizer: String(item?.organizer || 'Youth Ministry').trim() || 'Youth Ministry',
        contact: String(item?.contact || 'upperroom@fgcmgbuoba.org').trim() || 'upperroom@fgcmgbuoba.org',
        image: String(item?.imageUrl || item?.image || DEFAULT_EVENT_IMAGE).trim() || DEFAULT_EVENT_IMAGE,
        registrationLink: String(item?.registrationLink || '/contact').trim() || '/contact'
      }
    }

    const loadEvents = async () => {
      try {
        const botEvents = await fetchBotEvents()
        setEvents(botEvents.map(mapBotEventToPublicEvent))
        return
      } catch {
        setEvents([])
      }
    }

    loadEvents()
    const handleRefresh = () => {
      loadEvents()
    }

    window.addEventListener('adminEventsUpdated', handleRefresh)
    return () => {
      window.removeEventListener('adminEventsUpdated', handleRefresh)
    }
  }, [])

  const sortedEvents = [...events].sort((a, b) => a.startDate - b.startDate)

  const getWhatToExpectText = (event) => {
    const tags = Array.isArray(event?.whatToExpect) ? event.whatToExpect.filter(Boolean) : []
    if (tags.length === 0) {
      return event?.description || 'Details coming soon.'
    }
    return tags.map((tag) => `\`${tag}\``).join(', ')
  }

  const getRegistrationOptions = (event) => {
    if (!event?.registrationRequired) {
      return [{ label: 'Register for Free', href: event?.registrationLink || '/contact' }]
    }

    const options = []
    const methods = normalizeRegistrationMethods(event?.registrationMethods)
    const whatsappHref = toWhatsAppLink(methods.whatsapp.phone)

    if (methods.whatsapp.enabled && whatsappHref) {
      options.push({ label: methods.whatsapp.label, href: whatsappHref })
    }

    if (methods.payment.enabled && /^https?:\/\//i.test(methods.payment.url)) {
      options.push({ label: methods.payment.label, href: methods.payment.url })
    }

    if (options.length === 0) {
      options.push({ label: 'Register for Free', href: event?.registrationLink || '/contact' })
    }

    return options
  }

  // Filter state - Define 'today' first since it's used below
  const today = new Date()
  const [activeFilter, setActiveFilter] = useState('upcoming')
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'calendar'
  const [displayedMonth, setDisplayedMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  // Get the earliest upcoming event as featured event
  const upcomingEvents = sortedEvents
    .filter(event => event.startDate >= today)
    .sort((a, b) => a.startDate - b.startDate)
  const featuredEvents = (upcomingEvents.length > 0 ? upcomingEvents : sortedEvents).slice(0, 3)
  const baseEvent = featuredEvents.length > 0 ? featuredEvents[featuredIndex % featuredEvents.length] : sortedEvents[0]
  const featuredEvent = baseEvent
    ? {
      ...baseEvent,
      subtitle: baseEvent.category || 'Featured Event',
      registrationLink: baseEvent.registrationLink || '/contact'
    }
    : null

  const featuredRegistrationOptions = featuredEvent ? getRegistrationOptions(featuredEvent) : []

  useEffect(() => {
    if (featuredEvents.length <= 1) {
      return
    }

    const rotateInterval = setInterval(() => {
      setContentFlipState('out')
    }, 10000)

    return () => clearInterval(rotateInterval)
  }, [featuredEvents.length])

  useEffect(() => {
    if (contentFlipState !== 'out' || featuredEvents.length <= 1) {
      return
    }

    const swapTimer = setTimeout(() => {
      setFeaturedIndex((prev) => (prev + 1) % featuredEvents.length)
      setContentFlipState('in')
    }, 150)

    const resetTimer = setTimeout(() => {
      setContentFlipState('idle')
    }, 500)

    return () => {
      clearTimeout(swapTimer)
      clearTimeout(resetTimer)
    }
  }, [contentFlipState, featuredEvents.length])

  // Countdown timer for featured event
  useEffect(() => {
    if (!featuredEvent?.startDate) {
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      return
    }

    const targetDate = new Date(featuredEvent.startDate).getTime()
    
    const interval = setInterval(() => {
      const now = new Date().getTime()
      const distance = targetDate - now

      setCountdown({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [featuredEvent?.startDate])

  useEffect(() => {
    if (!showEventModal) {
      document.body.classList.remove('modal-open')
      return
    }

    document.body.classList.add('modal-open')
    const focusTimer = window.setTimeout(() => {
      eventModalCloseRef.current?.focus()
    }, 40)

    const handleKeydown = (event) => {
      if (event.key === 'Escape') {
        closeEventModal()
        return
      }

      if (event.key !== 'Tab') {
        return
      }

      const panel = eventModalRef.current
      if (!panel) return

      const focusable = panel.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )

      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeydown)

    return () => {
      window.clearTimeout(focusTimer)
      document.body.classList.remove('modal-open')
      document.removeEventListener('keydown', handleKeydown)
    }
  }, [showEventModal])

  // Filter logic
  const filterEvents = () => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    switch (activeFilter) {
      case 'upcoming':
        return sortedEvents.filter(event => event.startDate >= now)
      case 'thisMonth':
        return sortedEvents.filter(event => 
          event.startDate.getMonth() === currentMonth && 
          event.startDate.getFullYear() === currentYear
        )
      case 'past':
        return sortedEvents.filter(event => event.startDate < now)
      default:
        return sortedEvents
    }
  }

  const filteredEvents = filterEvents().sort((a, b) => a.startDate - b.startDate)

  // Create carousel events with clones for infinite loop
  const carouselEvents = isMobile 
    ? [...filteredEvents, ...filteredEvents.slice(0, 1)]  // Clone 1 card for mobile
    : [...filteredEvents, ...filteredEvents.slice(0, 3)]  // Clone 3 cards for desktop

  // Grid carousel auto-rotation
  useEffect(() => {
    if (viewMode !== 'grid' || filteredEvents.length <= 1) {
      return
    }

    const carouselInterval = setInterval(() => {
      setIsTransitioning(true)
      setGridCarouselIndex((prev) => prev + 1)
    }, 5000)

    return () => clearInterval(carouselInterval)
  }, [viewMode, filteredEvents.length])

  // Handle infinite loop reset
  useEffect(() => {
    if (gridCarouselIndex === filteredEvents.length) {
      setTimeout(() => {
        setIsTransitioning(false)
        setGridCarouselIndex(0)
        setTimeout(() => {
          setIsTransitioning(true)
        }, 50)
      }, 600) // Wait for transition to complete
    }
  }, [gridCarouselIndex, filteredEvents.length])

  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December'
  ]

  const weekdayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const availableYears = Array.from(
    new Set([today.getFullYear(), ...sortedEvents.map((event) => event.startDate.getFullYear())])
  ).sort((a, b) => a - b)

  const displayedMonthYear = displayedMonth.getFullYear()
  const displayedMonthIndex = displayedMonth.getMonth()
  const firstDayOfMonth = new Date(displayedMonthYear, displayedMonthIndex, 1).getDay()
  const totalDaysInMonth = new Date(displayedMonthYear, displayedMonthIndex + 1, 0).getDate()

  const calendarEvents = sortedEvents.filter((event) => {
    return (
      event.startDate.getMonth() === displayedMonthIndex &&
      event.startDate.getFullYear() === displayedMonthYear
    )
  })

  const eventsByDay = calendarEvents.reduce((acc, event) => {
    const day = event.startDate.getDate()
    if (!acc[day]) {
      acc[day] = []
    }
    acc[day].push(event)
    return acc
  }, {})

  const previousMonth = () => {
    setDisplayedMonth(new Date(displayedMonthYear, displayedMonthIndex - 1, 1))
  }

  const nextMonth = () => {
    setDisplayedMonth(new Date(displayedMonthYear, displayedMonthIndex + 1, 1))
  }

  const goToCurrentMonth = () => {
    setDisplayedMonth(new Date(today.getFullYear(), today.getMonth(), 1))
  }

  const handleMonthSelect = (event) => {
    setDisplayedMonth(new Date(displayedMonthYear, Number(event.target.value), 1))
  }

  const handleYearSelect = (event) => {
    setDisplayedMonth(new Date(Number(event.target.value), displayedMonthIndex, 1))
  }

  const openEventModal = (eventItem, triggerEl = null) => {
    activeModalTriggerRef.current = triggerEl
    setSelectedEventForModal(eventItem)
    setShowEventModal(true)
    setShowShareDropdown(false)
    setEventModalStatus('')
  }

  const closeEventModal = () => {
    setShowEventModal(false)
    setShowShareDropdown(false)
    setEventModalStatus('')
    requestAnimationFrame(() => {
      activeModalTriggerRef.current?.focus()
    })
  }

  const handleCalendarDayClick = (dayEvents, triggerEl = null) => {
    if (dayEvents && dayEvents.length > 0) {
      openEventModal(dayEvents[0], triggerEl)
    }
  }

  const calendarCells = [
    ...Array.from({ length: firstDayOfMonth }, (_, index) => ({
      key: `empty-start-${index}`,
      isEmpty: true
    })),
    ...Array.from({ length: totalDaysInMonth }, (_, index) => {
      const day = index + 1
      const isToday =
        day === today.getDate() &&
        displayedMonthIndex === today.getMonth() &&
        displayedMonthYear === today.getFullYear()

      return {
        key: `day-${day}`,
        day,
        isToday,
        dayEvents: eventsByDay[day] || [],
        isEmpty: false
      }
    })
  ]

  // Helper functions
  const shareEvent = async (event, platform) => {
    const url = encodeURIComponent(window.location.href)
    const text = encodeURIComponent(`Check out ${event.title} at Upper Room Mgbuoba!`)
    
    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      email: `mailto:?subject=${encodeURIComponent(event.title)}&body=${text}%20${url}`
    }
    
    if (platform === 'copy') {
      try {
        await navigator.clipboard.writeText(window.location.href)
        setEventModalStatus('Event link copied to clipboard.')
      } catch {
        setEventModalStatus('Unable to copy link automatically. Please copy the URL from your browser.')
      }
      return
    }

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400')
      setEventModalStatus(`Sharing to ${platform}...`)
    }
  }

  const toCalendarUtcStamp = (value) => {
    return value.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  }

  const escapeIcsText = (value) => {
    return String(value || '')
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;')
  }

  const getEventDateRange = (event) => {
    const start = new Date(event.startDate)
    const timeText = String(event.time || '')
      .toLowerCase()
      .trim()

    // Try parsing "7:30 pm" / "7 pm" / "19:30" patterns from event.time.
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
      const hours = Number(twentyFourHourMatch[1])
      const minutes = Number(twentyFourHourMatch[2])
      start.setHours(hours, minutes, 0, 0)
    } else {
      // Fallback when time is unavailable (e.g., "Time TBA").
      start.setHours(9, 0, 0, 0)
    }

    const end = new Date(start.getTime() + (2 * 60 * 60 * 1000))
    return { start, end }
  }

  const buildCalendarDetails = (event) => {
    const lines = [event.description]
    if (event.organizer) lines.push(`Organizer: ${event.organizer}`)
    if (event.contact) lines.push(`Contact: ${event.contact}`)

    if (event.registrationLink) {
      const registrationHref = String(event.registrationLink).startsWith('http')
        ? event.registrationLink
        : `${window.location.origin}${String(event.registrationLink).startsWith('/') ? event.registrationLink : `/${event.registrationLink}`}`
      lines.push(`Registration: ${registrationHref}`)
    }

    return lines.filter(Boolean).join('\n\n')
  }

  const exportToCalendar = (event, format) => {
    const { start, end } = getEventDateRange(event)
    const startDate = toCalendarUtcStamp(start)
    const endDate = toCalendarUtcStamp(end)
    const details = buildCalendarDetails(event)

    if (format === 'google') {
      const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDate}/${endDate}&details=${encodeURIComponent(details)}&location=${encodeURIComponent(event.location)}`
      window.open(googleUrl, '_blank')
    } else if (format === 'outlook') {
      const outlookUrl = `https://outlook.live.com/calendar/0/deeplink/compose?path=/calendar/action/compose&rru=addevent&subject=${encodeURIComponent(event.title)}&startdt=${encodeURIComponent(start.toISOString())}&enddt=${encodeURIComponent(end.toISOString())}&body=${encodeURIComponent(details)}&location=${encodeURIComponent(event.location)}`
      window.open(outlookUrl, '_blank')
    } else if (format === 'ical') {
      const icalContent = [
        'BEGIN:VCALENDAR',
        'VERSION:2.0',
        'PRODID:-//FGC Upper Room//Events//EN',
        'CALSCALE:GREGORIAN',
        'BEGIN:VEVENT',
        `UID:${Date.now()}-${Math.random().toString(36).slice(2)}@fgcupperroom.local`,
        `DTSTAMP:${toCalendarUtcStamp(new Date())}`,
        `DTSTART:${startDate}`,
        `DTEND:${endDate}`,
        `SUMMARY:${escapeIcsText(event.title)}`,
        `DESCRIPTION:${escapeIcsText(details)}`,
        `LOCATION:${escapeIcsText(event.location)}`,
        'END:VEVENT',
        'END:VCALENDAR'
      ].join('\n')

      const blob = new Blob([icalContent], { type: 'text/calendar' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${event.title.replace(/\s+/g, '-')}.ics`
      link.click()
      URL.revokeObjectURL(link.href)
    }
  }

  return (
    <main id="main-content" className="events-page">
      <section className="page-banner bg-red">
        <div className="container">
          <h1>Events</h1>
          <p>Upcoming programs and activities</p>
        </div>
      </section>

      {/* Featured Event Hero */}
      {featuredEvent ? (
        <section className="featured-event">
          <div className="container">
            <div className="featured-event__card">
              <div className="featured-event__image">
                <img src={featuredEvent.image} alt={featuredEvent.title} />
                <div className="featured-event__overlay" />
              </div>
              <div className={`featured-event__content ${contentFlipState === 'out' ? 'featured-event__content--flip-out' : ''} ${contentFlipState === 'in' ? 'featured-event__content--flip-in' : ''}`}>
                <span className="featured-event__tag">Next Major Event</span>
                <h2>{featuredEvent.title}</h2>
                <p className="featured-event__subtitle">
                  {featuredEvent.subtitle.split(',').map((cat, idx) => (
                    <code key={idx}>{cat.trim()}</code>
                  ))}
                </p>

                <div className="featured-event__countdown">
                  <div className="countdown-item">
                    <span className="countdown-number">{countdown.days}</span>
                    <span className="countdown-label">Days</span>
                  </div>
                  <div className="countdown-item">
                    <span className="countdown-number">{countdown.hours}</span>
                    <span className="countdown-label">Hours</span>
                  </div>
                  <div className="countdown-item">
                    <span className="countdown-number">{countdown.minutes}</span>
                    <span className="countdown-label">Minutes</span>
                  </div>
                  <div className="countdown-item">
                    <span className="countdown-number">{countdown.seconds}</span>
                    <span className="countdown-label">Seconds</span>
                  </div>
                </div>

                <p className="featured-event__description">{getWhatToExpectText(featuredEvent)}</p>

                <div className="featured-event__details">
                  <div className="featured-event__detail">
                    <i className="fa-solid fa-calendar"></i>
                    <span>{featuredEvent.date}</span>
                  </div>
                  <div className="featured-event__detail">
                    <i className="fa-solid fa-clock"></i>
                    <span>{featuredEvent.time}</span>
                  </div>
                  <div className="featured-event__detail">
                    <i className="fa-solid fa-location-dot"></i>
                    <span>{featuredEvent.location}</span>
                  </div>
                  <div className="featured-event__detail">
                    <i className="fa-solid fa-ticket"></i>
                    <span>{featuredEvent.price}</span>
                  </div>
                </div>

                <div className="featured-event__registration-actions">
                  {featuredRegistrationOptions.map((option, index) => (
                    <Button
                      key={`${option.label}-${index}`}
                      href={option.href}
                      variant={index === 0 ? 'primary' : 'outline'}
                      size="lg"
                      external={option.href.startsWith('http')}
                      target={option.href.startsWith('http') ? '_blank' : undefined}
                      rel={option.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : (
        <section className="featured-event">
          <div className="container">
            <div className="featured-event__card">
              <div className="featured-event__content">
                <span className="featured-event__tag">Events</span>
                <h2>No Events Published Yet</h2>
                <p className="featured-event__description">
                  Upcoming events will appear here as soon as they are created in the Admin dashboard.
                </p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="events-section">
        <div className="container">
          <SectionHeader tag="Upcoming" title="Our Events" />
          
          <div className="events-controls">
            {viewMode === 'grid' && (
              <div className="events-filters">
                <button 
                  type="button"
                  className={`filter-tab ${activeFilter === 'upcoming' ? 'filter-tab--active' : ''}`}
                  onClick={() => setActiveFilter('upcoming')}
                  aria-pressed={activeFilter === 'upcoming'}
                >
                  <i className="fa-solid fa-calendar-days"></i>
                  <span>Upcoming Events</span>
                </button>
                <button 
                  type="button"
                  className={`filter-tab ${activeFilter === 'thisMonth' ? 'filter-tab--active' : ''}`}
                  onClick={() => setActiveFilter('thisMonth')}
                  aria-pressed={activeFilter === 'thisMonth'}
                >
                  <i className="fa-solid fa-calendar-week"></i>
                  <span>This Month</span>
                </button>
                <button 
                  type="button"
                  className={`filter-tab ${activeFilter === 'past' ? 'filter-tab--active' : ''}`}
                  onClick={() => setActiveFilter('past')}
                  aria-pressed={activeFilter === 'past'}
                >
                  <i className="fa-solid fa-clock-rotate-left"></i>
                  <span>Past Events</span>
                </button>
              </div>
            )}

            {viewMode === 'calendar' && (
              <div className="calendar-toolbar">
                <button type="button" className="calendar-nav-btn" onClick={previousMonth} aria-label="Previous month">
                  <i className="fa-solid fa-chevron-left"></i>
                </button>

                <div className="calendar-month-selectors">
                  <DropdownSelect
                    className="calendar-select"
                    value={displayedMonthIndex}
                    onChange={handleMonthSelect}
                    aria-label="Select month"
                  >
                    {monthNames.map((month, index) => (
                      <option key={month} value={index}>{month}</option>
                    ))}
                  </DropdownSelect>

                  <DropdownSelect
                    className="calendar-select"
                    value={displayedMonthYear}
                    onChange={handleYearSelect}
                    aria-label="Select year"
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </DropdownSelect>
                </div>

                <button type="button" className="calendar-nav-btn" onClick={nextMonth} aria-label="Next month">
                  <i className="fa-solid fa-chevron-right"></i>
                </button>

                <button type="button" className="calendar-today-btn" onClick={goToCurrentMonth}>
                  Today
                </button>
              </div>
            )}

            {/* View Toggle */}
            <div className="view-toggle">
              <button 
                type="button"
                className={`view-toggle__btn ${viewMode === 'grid' ? 'view-toggle__btn--active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
                aria-label="Switch to grid view"
                aria-pressed={viewMode === 'grid'}
              >
                <i className="fa-solid fa-border-all"></i>
              </button>
              <button 
                type="button"
                className={`view-toggle__btn ${viewMode === 'calendar' ? 'view-toggle__btn--active' : ''}`}
                onClick={() => setViewMode('calendar')}
                title="Calendar View"
                aria-label="Switch to calendar view"
                aria-pressed={viewMode === 'calendar'}
              >
                <i className="fa-solid fa-calendar-days"></i>
              </button>
            </div>
          </div>

          {/* Grid View - Auto Carousel */}
          {viewMode === 'grid' && filteredEvents.length > 0 && (
            <div className="events-carousel-grid">
              <div className="carousel-scroll-container">
                <div 
                  className="carousel-scroll" 
                  style={{ 
                    transform: `translateX(-${gridCarouselIndex * (isMobile ? 100 : 33.333)}%)`,
                    transition: isTransitioning ? 'transform 0.6s ease-in-out' : 'none'
                  }}
                >
                  {carouselEvents.map((event, i) => (
                    <div key={i} className="carousel-grid-card">
                      <div>
                        {(() => {
                          const cardRegistrationOptions = getRegistrationOptions(event)
                          const primaryRegistration = cardRegistrationOptions[0]

                          return (
                            <>
                        <div className="carousel-grid-card__header">
                          <div className="carousel-grid-card__date">{event.date}</div>
                        </div>
                        <h4 className="carousel-grid-card__title">{event.title}</h4>
                        <p className="carousel-grid-card__category">
                          {event.category.split(',').map((cat, idx) => (
                            <code key={idx}>{cat.trim()}</code>
                          ))}
                        </p>
                        <div className="carousel-grid-card__details">
                          <div className="carousel-grid-card__detail">
                            <i className="fa-solid fa-clock"></i>
                            <span>{event.time}</span>
                          </div>
                          <div className="carousel-grid-card__detail">
                            <i className="fa-solid fa-location-dot"></i>
                            <span>{event.location}</span>
                          </div>
                          <div className="carousel-grid-card__detail">
                            <i className="fa-solid fa-ticket"></i>
                            <span>{event.price}</span>
                          </div>
                        </div>
                        <div className="carousel-grid-card__actions">
                          <button 
                            type="button"
                            onClick={(clickEvent) => {
                              openEventModal(event, clickEvent.currentTarget)
                            }}
                            className="carousel-grid-card__read-more"
                          >
                            Read More
                          </button>
                          <Button
                            href={primaryRegistration?.href || '/contact'}
                            variant="primary"
                            size="sm"
                            external={(primaryRegistration?.href || '').startsWith('http')}
                            target={(primaryRegistration?.href || '').startsWith('http') ? '_blank' : undefined}
                            rel={(primaryRegistration?.href || '').startsWith('http') ? 'noopener noreferrer' : undefined}
                          >
                            {primaryRegistration?.label || 'Register'}
                          </Button>
                        </div>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Carousel navigation dots */}
              <div className="carousel-scroll-indicators">
                {filteredEvents.map((_, i) => (
                  <button
                    key={i}
                    className={`carousel-scroll-indicator ${i === gridCarouselIndex % filteredEvents.length ? 'active' : ''}`}
                    onClick={() => {
                      setIsTransitioning(true)
                      setGridCarouselIndex(i)
                    }}
                    aria-label={`Go to event ${i + 1}`}
                  />
                ))}
              </div>
            </div>
          )}

          {viewMode === 'grid' && filteredEvents.length === 0 && (
            <div className="calendar-empty-state">
              No events match this filter yet.
            </div>
          )}

          {/* Event Detail Modal */}
          {showEventModal && selectedEventForModal && (
            <div
              className="event-modal-overlay"
              onClick={closeEventModal}
              role="dialog"
              aria-modal="true"
              aria-labelledby="event-modal-title"
            >
              <div ref={eventModalRef} className="event-modal" onClick={(e) => e.stopPropagation()}>
                <div className="event-modal__header">
                  <h2 id="event-modal-title">{selectedEventForModal.title}</h2>
                  <div className="event-modal__header-actions">
                    <div className="event-modal__share-dropdown-wrapper">
                      <button 
                        type="button"
                        className="event-modal__share-btn"
                        onClick={() => setShowShareDropdown(!showShareDropdown)}
                        title="Share event"
                        aria-label="Share this event"
                        aria-haspopup="menu"
                        aria-expanded={showShareDropdown}
                      >
                        <i className="fa-solid fa-share-nodes"></i>
                      </button>
                      {showShareDropdown && (
                        <div className="event-modal__share-dropdown" role="menu" aria-label="Share options">
                          <button 
                            type="button"
                            onClick={() => {
                              shareEvent(selectedEventForModal, 'facebook')
                              setShowShareDropdown(false)
                            }}
                            className="share-dropdown-item"
                            role="menuitem"
                          >
                            <i className="fa-brands fa-facebook"></i> Facebook
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              shareEvent(selectedEventForModal, 'twitter')
                              setShowShareDropdown(false)
                            }}
                            className="share-dropdown-item"
                            role="menuitem"
                          >
                            <i className="fa-brands fa-x-twitter"></i> X (Twitter)
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              shareEvent(selectedEventForModal, 'whatsapp')
                              setShowShareDropdown(false)
                            }}
                            className="share-dropdown-item"
                            role="menuitem"
                          >
                            <i className="fa-brands fa-whatsapp"></i> WhatsApp
                          </button>
                          <button 
                            type="button"
                            onClick={() => {
                              shareEvent(selectedEventForModal, 'copy')
                              setShowShareDropdown(false)
                            }}
                            className="share-dropdown-item share-dropdown-item--copy"
                            role="menuitem"
                          >
                            <i className="fa-solid fa-copy"></i> Copy Link
                          </button>
                        </div>
                      )}
                    </div>
                    <button
                      ref={eventModalCloseRef}
                      type="button"
                      className="event-modal__close"
                      onClick={closeEventModal}
                      aria-label="Close event details"
                    >
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                </div>
                
                <div className="event-modal__image">
                  <img src={selectedEventForModal.image} alt={selectedEventForModal.title} />
                </div>
                
                <div className="event-modal__content">
                  <p className="event-modal__status" aria-live="polite">
                    {eventModalStatus}
                  </p>
                  {(() => {
                    const registrationOptions = getRegistrationOptions(selectedEventForModal)

                    return (
                      <>
                  <p className="event-modal__category">
                    {selectedEventForModal.category.split(',').map((cat, idx) => (
                      <code key={idx}>{cat.trim()}</code>
                    ))}
                  </p>

                  <div className="event-modal__details">
                    <div className="event-modal__detail">
                      <i className="fa-solid fa-calendar"></i>
                      <span>{selectedEventForModal.date}</span>
                    </div>
                    <div className="event-modal__detail">
                      <i className="fa-solid fa-clock"></i>
                      <span>{selectedEventForModal.time}</span>
                    </div>
                    <div className="event-modal__detail">
                      <i className="fa-solid fa-location-dot"></i>
                      <span>{selectedEventForModal.location}</span>
                    </div>
                    <div className="event-modal__detail">
                      <i className="fa-solid fa-ticket"></i>
                      <span>{selectedEventForModal.price}</span>
                    </div>
                  </div>

                  <p className="event-modal__description">{getWhatToExpectText(selectedEventForModal)}</p>

                  <div className="event-modal__organizer">
                    <strong>Organizer:</strong> {selectedEventForModal.organizer}
                  </div>

                  <div className="event-modal__calendar-actions">
                    <button
                      type="button"
                      className="event-modal__calendar-btn"
                      onClick={() => exportToCalendar(selectedEventForModal, 'google')}
                    >
                      <i className="fa-brands fa-google"></i>
                      Add to Google Calendar
                    </button>
                    <button
                      type="button"
                      className="event-modal__calendar-btn event-modal__calendar-btn--outline"
                      onClick={() => exportToCalendar(selectedEventForModal, 'outlook')}
                    >
                      <i className="fa-brands fa-microsoft"></i>
                      Add to Outlook
                    </button>
                    <button
                      type="button"
                      className="event-modal__calendar-btn event-modal__calendar-btn--outline"
                      onClick={() => exportToCalendar(selectedEventForModal, 'ical')}
                    >
                      <i className="fa-solid fa-download"></i>
                      Download .ics
                    </button>
                  </div>

                  <div className="event-modal__registration-actions">
                    {registrationOptions.map((option, index) => (
                      <Button
                        key={`${option.label}-${index}`}
                        href={option.href}
                        variant={index === 0 ? 'primary' : 'outline'}
                        size="lg"
                        className="event-modal__register"
                        external={option.href.startsWith('http')}
                        target={option.href.startsWith('http') ? '_blank' : undefined}
                        rel={option.href.startsWith('http') ? 'noopener noreferrer' : undefined}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                      </>
                    )
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Calendar View */}
          {viewMode === 'calendar' && (
            <div className="events-calendar">
              <div className="calendar-header-row">
                {weekdayNames.map((weekday) => (
                  <div key={weekday} className="calendar-header-cell">{weekday}</div>
                ))}
              </div>

              <div className="calendar-grid">
                {calendarCells.map((cell) => {
                  if (cell.isEmpty) {
                    return <div key={cell.key} className="calendar-day calendar-day--empty" />
                  }

                  const hasEvents = cell.dayEvents.length > 0

                  return (
                    <div
                      key={cell.key}
                      className={`calendar-day ${hasEvents ? 'calendar-day--has-events' : ''} ${cell.isToday ? 'calendar-day--today' : ''}`}
                      onClick={(event) => handleCalendarDayClick(cell.dayEvents, event.currentTarget)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault()
                          handleCalendarDayClick(cell.dayEvents, event.currentTarget)
                        }
                      }}
                      role={hasEvents ? 'button' : undefined}
                      tabIndex={hasEvents ? 0 : undefined}
                      aria-label={hasEvents ? `Open event details for ${monthNames[displayedMonthIndex]} ${cell.day}` : undefined}
                      style={hasEvents ? { cursor: 'pointer' } : {}}
                    >
                      <span className="calendar-day__number">{cell.day}</span>

                      {hasEvents && (
                        <div className="calendar-day__events">
                          {cell.dayEvents.slice(0, 2).map((event) => (
                            <span key={event.title} className="calendar-day__event-chip">
                              {event.title}
                            </span>
                          ))}
                          {cell.dayEvents.length > 2 && (
                            <span className="calendar-day__more">+{cell.dayEvents.length - 2} more</span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>

              <div className="calendar-legend">
                <span className="calendar-legend__item">
                  <span className="calendar-legend__dot calendar-legend__dot--today" />
                  Today ({today.toLocaleDateString()})
                </span>
                <span className="calendar-legend__item">
                  <span className="calendar-legend__dot calendar-legend__dot--event" />
                  Event Date
                </span>
              </div>

              {calendarEvents.length === 0 && (
                <div className="calendar-empty-state">
                  No events scheduled for {monthNames[displayedMonthIndex]} {displayedMonthYear}.
                </div>
              )}
            </div>
          )}
        </div>
      </section>

    </main>
  )
}

export default Events
