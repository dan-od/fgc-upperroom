import { useState, useEffect } from 'react'
import { SectionHeader, Button } from '../../components/common'
import { subscribeVisitor } from '../../utils/subscribeApi'
import './Events.css'

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
  const [isMobile, setIsMobile] = useState(false)
  const [isTransitioning, setIsTransitioning] = useState(true)

  // Subscribe form state
  const [subForm, setSubForm] = useState({ name: '', phone: '', email: '' })
  const [subSubmitting, setSubSubmitting] = useState(false)
  const [subStatus, setSubStatus] = useState(null) // null | 'success' | 'error'
  const [subMessage, setSubMessage] = useState('')

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  const events = [
    { 
      title: 'Upper Room Week', 
      date: 'September 15-21, 2026',
      startDate: new Date('2026-09-15'),
      time: '5:00 PM - 8:00 PM Daily',
      description: 'A week of intensive programs for young people', 
      location: 'FGC Mgbuoba',
      category: 'Conference',
      price: 'Free',
      organizer: 'Youth Ministry',
      contact: 'upperroom@fgcmgbuoba.org',
      image: './assets/media/Senior Pastor.jpeg'
    },
    { 
      title: 'Youth Camp', 
      date: 'August 19-21, 2026',
      startDate: new Date('2026-08-19'),
      time: '3 Day Event',
      description: 'Fellowship, fun, and spiritual renewal', 
      location: 'Uyo',
      category: 'Retreat',
      price: '₦5,000',
      organizer: 'Youth Ministry',
      contact: 'theupperroom4sq@gmail.com',
      image: './assets/media/Senior Pastor.jpeg'
    },
    { 
      title: 'Thanksgiving & Carol', 
      date: 'December 20, 2026',
      startDate: new Date('2026-12-20'),
      time: '10:00 AM - 2:00 PM',
      description: "Celebrating God's faithfulness", 
      location: 'FGC Mgbuoba',
      category: 'Worship',
      price: 'Free',
      organizer: 'Praise & Worship Team',
      contact: 'upperroom@fgcmgbuoba.org',
      image: './assets/media/Senior Pastor.jpeg'
    },
    { 
      title: 'New Year Praise Night', 
      date: 'January 1, 2026',
      startDate: new Date('2026-01-01'),
      time: '11:00 PM - 1:00 AM',
      description: 'Welcome the new year with praise and worship', 
      location: 'FGC Mgbuoba',
      category: 'Worship',
      price: 'Free',
      organizer: 'Praise & Worship Team',
      contact: 'upperroom@fgcmgbuoba.org',
      image: './assets/media/Senior Pastor.jpeg'
    },
    { 
      title: 'Teens — Impact Summit', 
      date: 'March 14, 2026',
      startDate: new Date('2026-03-14'),
      time: '10:00 AM',
      description: 'Next-Gen Architects: Mentoring Teenagers in this Generation', 
      location: 'FGC Mgbuoba',
      category: 'Worship, Talk Shows, Discussions',
      price: 'Free',
      organizer: 'Teen Ministry',
      contact: 'upperroom@fgcmgbuoba.org',
      image: './assets/media/events/images/teens_summit2026.png'
    }
  ]

  // Sort all events by date chronologically
  events.sort((a, b) => a.startDate - b.startDate)

  // Filter state - Define 'today' first since it's used below
  const today = new Date()
  const [activeFilter, setActiveFilter] = useState('upcoming')
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'calendar'
  const [displayedMonth, setDisplayedMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  // Get the earliest upcoming event as featured event
  const upcomingEvents = events
    .filter(event => event.startDate >= today)
    .sort((a, b) => a.startDate - b.startDate)
  const featuredEvents = (upcomingEvents.length > 0 ? upcomingEvents : events).slice(0, 3)
  const baseEvent = featuredEvents.length > 0 ? featuredEvents[featuredIndex % featuredEvents.length] : events[0]
  const featuredEvent = {
    ...baseEvent,
    subtitle: baseEvent.category || 'Featured Event',
    registrationLink: baseEvent.registrationLink || '/contact'
  }

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
  }, [featuredEvent.startDate])

  // Filter logic
  const filterEvents = () => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()

    switch (activeFilter) {
      case 'upcoming':
        return events.filter(event => event.startDate >= now)
      case 'thisMonth':
        return events.filter(event => 
          event.startDate.getMonth() === currentMonth && 
          event.startDate.getFullYear() === currentYear
        )
      case 'past':
        return events.filter(event => event.startDate < now)
      default:
        return events
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
    new Set([today.getFullYear(), ...events.map((event) => event.startDate.getFullYear())])
  ).sort((a, b) => a - b)

  const displayedMonthYear = displayedMonth.getFullYear()
  const displayedMonthIndex = displayedMonth.getMonth()
  const firstDayOfMonth = new Date(displayedMonthYear, displayedMonthIndex, 1).getDay()
  const totalDaysInMonth = new Date(displayedMonthYear, displayedMonthIndex + 1, 0).getDate()

  const calendarEvents = events.filter((event) => {
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

  const handleCalendarDayClick = (dayEvents) => {
    if (dayEvents && dayEvents.length > 0) {
      setSelectedEventForModal(dayEvents[0])
      setShowEventModal(true)
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
  const shareEvent = (event, platform) => {
    const url = encodeURIComponent(window.location.href)
    const text = encodeURIComponent(`Check out ${event.title} at Upper Room Mgbuoba!`)
    
    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      whatsapp: `https://wa.me/?text=${text}%20${url}`,
      email: `mailto:?subject=${encodeURIComponent(event.title)}&body=${text}%20${url}`
    }
    
    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400')
    }
  }

  const exportToCalendar = (event, format) => {
    const startDate = event.startDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
    
    if (format === 'google') {
      const googleUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(event.title)}&dates=${startDate}/${startDate}&details=${encodeURIComponent(event.description)}&location=${encodeURIComponent(event.location)}`
      window.open(googleUrl, '_blank')
    } else if (format === 'ical') {
      const icalContent = `BEGIN:VCALENDAR
        VERSION:2.0
        BEGIN:VEVENT
        DTSTART:${startDate}
        SUMMARY:${event.title}
        DESCRIPTION:${event.description}
        LOCATION:${event.location}
        END:VEVENT
        END:VCALENDAR`
      
      const blob = new Blob([icalContent], { type: 'text/calendar' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${event.title.replace(/\s+/g, '-')}.ics`
      link.click()
    }
  }

  const handleSubChange = (e) => {
    const { name, value } = e.target
    setSubForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubSubmit = async (e) => {
    e.preventDefault()
    setSubSubmitting(true)
    setSubStatus(null)

    const result = await subscribeVisitor(subForm)

    setSubSubmitting(false)
    setSubMessage(result.message)
    setSubStatus(result.ok ? 'success' : 'error')

    if (result.ok) {
      setSubForm({ name: '', phone: '', email: '' })
    }
  }

  return (
    <main className="events-page">
      <section className="page-banner bg-red">
        <div className="container">
          <h1>Events</h1>
          <p>Upcoming programs and activities</p>
        </div>
      </section>

      {/* Featured Event Hero */}
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

              <p className="featured-event__description">{featuredEvent.description}</p>
              
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

              <Button href={featuredEvent.registrationLink} variant="primary" size="lg">
                Register for Free
              </Button>
            </div>
          </div>
        </div>
      </section>

      <section className="events-section">
        <div className="container">
          <SectionHeader tag="Upcoming" title="Our Events" />
          
          <div className="events-controls">
            {viewMode === 'grid' && (
              <div className="events-filters">
                <button 
                  className={`filter-tab ${activeFilter === 'upcoming' ? 'filter-tab--active' : ''}`}
                  onClick={() => setActiveFilter('upcoming')}
                >
                  <i className="fa-solid fa-calendar-days"></i>
                  Upcoming Events
                </button>
                <button 
                  className={`filter-tab ${activeFilter === 'thisMonth' ? 'filter-tab--active' : ''}`}
                  onClick={() => setActiveFilter('thisMonth')}
                >
                  <i className="fa-solid fa-calendar-week"></i>
                  This Month
                </button>
                <button 
                  className={`filter-tab ${activeFilter === 'past' ? 'filter-tab--active' : ''}`}
                  onClick={() => setActiveFilter('past')}
                >
                  <i className="fa-solid fa-clock-rotate-left"></i>
                  Past Events
                </button>
              </div>
            )}

            {viewMode === 'calendar' && (
              <div className="calendar-toolbar">
                <button className="calendar-nav-btn" onClick={previousMonth} aria-label="Previous month">
                  <i className="fa-solid fa-chevron-left"></i>
                </button>

                <div className="calendar-month-selectors">
                  <select
                    className="calendar-select"
                    value={displayedMonthIndex}
                    onChange={handleMonthSelect}
                    aria-label="Select month"
                  >
                    {monthNames.map((month, index) => (
                      <option key={month} value={index}>{month}</option>
                    ))}
                  </select>

                  <select
                    className="calendar-select"
                    value={displayedMonthYear}
                    onChange={handleYearSelect}
                    aria-label="Select year"
                  >
                    {availableYears.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <button className="calendar-nav-btn" onClick={nextMonth} aria-label="Next month">
                  <i className="fa-solid fa-chevron-right"></i>
                </button>

                <button className="calendar-today-btn" onClick={goToCurrentMonth}>
                  Today
                </button>
              </div>
            )}

            {/* View Toggle */}
            <div className="view-toggle">
              <button 
                className={`view-toggle__btn ${viewMode === 'grid' ? 'view-toggle__btn--active' : ''}`}
                onClick={() => setViewMode('grid')}
                title="Grid View"
              >
                <i className="fa-solid fa-border-all"></i>
              </button>
              <button 
                className={`view-toggle__btn ${viewMode === 'calendar' ? 'view-toggle__btn--active' : ''}`}
                onClick={() => setViewMode('calendar')}
                title="Calendar View"
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
                            onClick={() => {
                              setSelectedEventForModal(event)
                              setShowEventModal(true)
                            }}
                            className="carousel-grid-card__read-more"
                          >
                            Read More
                          </button>
                          <Button href="/contact" variant="primary" size="sm">
                            Register
                          </Button>
                        </div>
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

          {/* Event Detail Modal */}
          {showEventModal && selectedEventForModal && (
            <div className="event-modal-overlay" onClick={() => setShowEventModal(false)}>
              <div className="event-modal" onClick={(e) => e.stopPropagation()}>
                <div className="event-modal__header">
                  <h2>{selectedEventForModal.title}</h2>
                  <div className="event-modal__header-actions">
                    <div className="event-modal__share-dropdown-wrapper">
                      <button 
                        className="event-modal__share-btn"
                        onClick={() => setShowShareDropdown(!showShareDropdown)}
                        title="Share event"
                      >
                        <i className="fa-solid fa-share-nodes"></i>
                      </button>
                      {showShareDropdown && (
                        <div className="event-modal__share-dropdown">
                          <button 
                            onClick={() => {
                              shareEvent(selectedEventForModal, 'facebook')
                              setShowShareDropdown(false)
                            }}
                            className="share-dropdown-item"
                          >
                            <i className="fa-brands fa-facebook"></i> Facebook
                          </button>
                          <button 
                            onClick={() => {
                              shareEvent(selectedEventForModal, 'twitter')
                              setShowShareDropdown(false)
                            }}
                            className="share-dropdown-item"
                          >
                            <i className="fa-brands fa-x-twitter"></i> X (Twitter)
                          </button>
                          <button 
                            onClick={() => {
                              shareEvent(selectedEventForModal, 'whatsapp')
                              setShowShareDropdown(false)
                            }}
                            className="share-dropdown-item"
                          >
                            <i className="fa-brands fa-whatsapp"></i> WhatsApp
                          </button>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(window.location.href)
                              alert('Event link copied to clipboard!')
                              setShowShareDropdown(false)
                            }}
                            className="share-dropdown-item share-dropdown-item--copy"
                          >
                            <i className="fa-solid fa-copy"></i> Copy Link
                          </button>
                        </div>
                      )}
                    </div>
                    <button className="event-modal__close" onClick={() => setShowEventModal(false)}>
                      <i className="fa-solid fa-xmark"></i>
                    </button>
                  </div>
                </div>
                
                <div className="event-modal__image">
                  <img src={selectedEventForModal.image} alt={selectedEventForModal.title} />
                </div>
                
                <div className="event-modal__content">
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

                  <p className="event-modal__description">{selectedEventForModal.description}</p>

                  <div className="event-modal__organizer">
                    <strong>Organizer:</strong> {selectedEventForModal.organizer}
                  </div>

                  <Button href="/contact" variant="primary" size="lg" className="event-modal__register">
                    Register for Free
                  </Button>
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
                      onClick={() => handleCalendarDayClick(cell.dayEvents)}
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

      {/* Event Newsletter Subscribe */}
      <section className="event-newsletter">
        <div className="container">
          <div className="event-newsletter__content">
            <div className="event-newsletter__text">
              <h2>Never Miss an Event</h2>
              <p>Subscribe for WhatsApp reminders about upcoming programs, early registrations, and exclusive updates.</p>
            </div>

            {subStatus === 'success' ? (
              <div className="event-newsletter__success">
                <i className="fa-solid fa-circle-check"></i>
                <p>{subMessage}</p>
              </div>
            ) : (
              <form className="event-newsletter__form event-newsletter__form--full" onSubmit={handleSubSubmit}>
                {subStatus === 'error' && (
                  <p className="event-newsletter__error">{subMessage}</p>
                )}
                <input
                  type="text"
                  name="name"
                  placeholder="Your Full Name"
                  className="event-newsletter__input"
                  value={subForm.name}
                  onChange={handleSubChange}
                  required
                  disabled={subSubmitting}
                />
                <input
                  type="tel"
                  name="phone"
                  placeholder="WhatsApp Number (e.g., +234 8123456789)"
                  className="event-newsletter__input"
                  value={subForm.phone}
                  onChange={handleSubChange}
                  required
                  disabled={subSubmitting}
                />
                <input
                  type="email"
                  name="email"
                  placeholder="Your Email Address"
                  className="event-newsletter__input"
                  value={subForm.email}
                  onChange={handleSubChange}
                  required
                  disabled={subSubmitting}
                />
                <Button type="submit" variant="white" size="lg" disabled={subSubmitting}>
                  {subSubmitting ? 'Subscribing…' : 'Subscribe'}
                </Button>
              </form>
            )}
          </div>
        </div>
      </section>
    </main>
  )
}

export default Events
