import { useState, useEffect } from 'react'
import { SectionHeader, Button, DropdownSelect } from '../../components/common'
import { getRegistrationOptions } from './usePublicEvents'
import EventSubscribeForm from './EventSubscribeForm'

const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December']
const weekdayNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

export default function EventGrid({ events, sortedEvents, isMobile, gridCarouselIndex, setGridCarouselIndex, isTransitioning, setIsTransitioning, startCarouselAutoRotation, handleInfiniteLoopReset, onSelectEvent }) {
  const today = new Date()
  const [activeFilter, setActiveFilter] = useState('upcoming')
  const [viewMode, setViewMode] = useState('grid')
  const [displayedMonth, setDisplayedMonth] = useState(new Date(today.getFullYear(), today.getMonth(), 1))

  const upcomingEvents = sortedEvents.filter(e => e.startDate >= today)

  const filterEvents = () => {
    const now = new Date()
    switch (activeFilter) {
      case 'upcoming': return sortedEvents.filter(e => e.startDate >= now)
      case 'thisMonth': return sortedEvents.filter(e => e.startDate.getMonth() === now.getMonth() && e.startDate.getFullYear() === now.getFullYear())
      case 'past': return sortedEvents.filter(e => e.startDate < now)
      default: return sortedEvents
    }
  }

  const filteredEvents = filterEvents().sort((a, b) => a.startDate - b.startDate)
  const carouselEvents = isMobile
    ? [...filteredEvents, ...filteredEvents.slice(0, 1)]
    : [...filteredEvents, ...filteredEvents.slice(0, 3)]

  const displayedMonthYear = displayedMonth.getFullYear()
  const displayedMonthIndex = displayedMonth.getMonth()
  const firstDayOfMonth = new Date(displayedMonthYear, displayedMonthIndex, 1).getDay()
  const totalDaysInMonth = new Date(displayedMonthYear, displayedMonthIndex + 1, 0).getDate()
  const availableYears = Array.from(new Set([today.getFullYear(), ...sortedEvents.map(e => e.startDate.getFullYear())])).sort((a, b) => a - b)
  const calendarEvents = sortedEvents.filter(e => e.startDate.getMonth() === displayedMonthIndex && e.startDate.getFullYear() === displayedMonthYear)
  const eventsByDay = calendarEvents.reduce((acc, e) => { const d = e.startDate.getDate(); acc[d] = acc[d] ? [...acc[d], e] : [e]; return acc }, {})
  const calendarCells = [
    ...Array.from({ length: firstDayOfMonth }, (_, i) => ({ key: `empty-start-${i}`, isEmpty: true })),
    ...Array.from({ length: totalDaysInMonth }, (_, i) => {
      const day = i + 1
      return { key: `day-${day}`, day, isToday: day === today.getDate() && displayedMonthIndex === today.getMonth() && displayedMonthYear === today.getFullYear(), dayEvents: eventsByDay[day] || [], isEmpty: false }
    })
  ]

  useEffect(() => {
    const id = startCarouselAutoRotation(filteredEvents.length, viewMode)
    return () => { if (id) clearInterval(id) }
  }, [viewMode, filteredEvents.length])

  useEffect(() => {
    handleInfiniteLoopReset(gridCarouselIndex, filteredEvents.length)
  }, [gridCarouselIndex, filteredEvents.length])

  return (
    <>
      <section className="events-section">
        <div className="container">
          <SectionHeader tag="Upcoming" title="Our Events" />
          <div className="events-controls">
            {viewMode === 'grid' && (
              <div className="events-filters">
                {[['upcoming', 'fa-solid fa-calendar-days', 'Upcoming Events'], ['thisMonth', 'fa-solid fa-calendar-week', 'This Month'], ['past', 'fa-solid fa-clock-rotate-left', 'Past Events']].map(([filter, icon, label]) => (
                  <button key={filter} type="button" className={`filter-tab ${activeFilter === filter ? 'filter-tab--active' : ''}`} onClick={() => setActiveFilter(filter)} aria-pressed={activeFilter === filter}>
                    <i className={icon}></i><span>{label}</span>
                  </button>
                ))}
              </div>
            )}
            {viewMode === 'calendar' && (
              <div className="calendar-toolbar">
                <button type="button" className="calendar-nav-btn" onClick={() => setDisplayedMonth(new Date(displayedMonthYear, displayedMonthIndex - 1, 1))} aria-label="Previous month"><i className="fa-solid fa-chevron-left"></i></button>
                <div className="calendar-month-selectors">
                  <DropdownSelect className="calendar-select" value={displayedMonthIndex} onChange={e => setDisplayedMonth(new Date(displayedMonthYear, Number(e.target.value), 1))} aria-label="Select month">
                    {monthNames.map((m, i) => <option key={m} value={i}>{m}</option>)}
                  </DropdownSelect>
                  <DropdownSelect className="calendar-select" value={displayedMonthYear} onChange={e => setDisplayedMonth(new Date(Number(e.target.value), displayedMonthIndex, 1))} aria-label="Select year">
                    {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                  </DropdownSelect>
                </div>
                <button type="button" className="calendar-nav-btn" onClick={() => setDisplayedMonth(new Date(displayedMonthYear, displayedMonthIndex + 1, 1))} aria-label="Next month"><i className="fa-solid fa-chevron-right"></i></button>
                <button type="button" className="calendar-today-btn" onClick={() => setDisplayedMonth(new Date(today.getFullYear(), today.getMonth(), 1))}>Today</button>
              </div>
            )}
            <div className="view-toggle">
              {[['grid', 'fa-solid fa-border-all', 'Switch to grid view'], ['calendar', 'fa-solid fa-calendar-days', 'Switch to calendar view']].map(([mode, icon, label]) => (
                <button key={mode} type="button" className={`view-toggle__btn ${viewMode === mode ? 'view-toggle__btn--active' : ''}`} onClick={() => setViewMode(mode)} title={`${mode.charAt(0).toUpperCase() + mode.slice(1)} View`} aria-label={label} aria-pressed={viewMode === mode}>
                  <i className={icon}></i>
                </button>
              ))}
            </div>
          </div>

          {viewMode === 'grid' && filteredEvents.length > 0 && (
            <div className="events-carousel-grid">
              <div className="carousel-scroll-container">
                <div className="carousel-scroll" style={{ transform: `translateX(-${gridCarouselIndex * (isMobile ? 100 : 33.333)}%)`, transition: isTransitioning ? 'transform 0.6s ease-in-out' : 'none' }}>
                  {carouselEvents.map((event, i) => {
                    const primaryReg = getRegistrationOptions(event)[0]
                    return (
                      <div key={i} className="carousel-grid-card">
                        <div>
                          <div className="carousel-grid-card__header"><div className="carousel-grid-card__date">{event.date}</div></div>
                          <h4 className="carousel-grid-card__title">{event.title}</h4>
                          <p className="carousel-grid-card__category">{event.category.split(',').map((cat, idx) => <code key={idx}>{cat.trim()}</code>)}</p>
                          <div className="carousel-grid-card__details">
                            <div className="carousel-grid-card__detail"><i className="fa-solid fa-clock"></i><span>{event.time}</span></div>
                            <div className="carousel-grid-card__detail"><i className="fa-solid fa-location-dot"></i><span>{event.location}</span></div>
                            <div className="carousel-grid-card__detail"><i className="fa-solid fa-ticket"></i><span>{event.price}</span></div>
                          </div>
                          <div className="carousel-grid-card__actions">
                            <button type="button" onClick={(e) => onSelectEvent(event, e.currentTarget)} className="carousel-grid-card__read-more">Read More</button>
                            <Button href={primaryReg?.href || '/contact'} variant="primary" size="sm" external={(primaryReg?.href || '').startsWith('http')} target={(primaryReg?.href || '').startsWith('http') ? '_blank' : undefined} rel={(primaryReg?.href || '').startsWith('http') ? 'noopener noreferrer' : undefined}>{primaryReg?.label || 'Register'}</Button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="carousel-scroll-indicators">
                {filteredEvents.map((_, i) => (
                  <button key={i} className={`carousel-scroll-indicator ${i === gridCarouselIndex % filteredEvents.length ? 'active' : ''}`} onClick={() => { setIsTransitioning(true); setGridCarouselIndex(i) }} aria-label={`Go to event ${i + 1}`} />
                ))}
              </div>
            </div>
          )}
          {viewMode === 'grid' && filteredEvents.length === 0 && <div className="calendar-empty-state">No events match this filter yet.</div>}

          {viewMode === 'calendar' && (
            <div className="events-calendar">
              <div className="calendar-header-row">{weekdayNames.map(w => <div key={w} className="calendar-header-cell">{w}</div>)}</div>
              <div className="calendar-grid">
                {calendarCells.map(cell => {
                  if (cell.isEmpty) return <div key={cell.key} className="calendar-day calendar-day--empty" />
                  const hasEvents = cell.dayEvents.length > 0
                  return (
                    <div key={cell.key} className={`calendar-day ${hasEvents ? 'calendar-day--has-events' : ''} ${cell.isToday ? 'calendar-day--today' : ''}`} onClick={(e) => hasEvents && onSelectEvent(cell.dayEvents[0], e.currentTarget)} onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && hasEvents) { e.preventDefault(); onSelectEvent(cell.dayEvents[0], e.currentTarget) } }} role={hasEvents ? 'button' : undefined} tabIndex={hasEvents ? 0 : undefined} aria-label={hasEvents ? `Open event details for ${monthNames[displayedMonthIndex]} ${cell.day}` : undefined} style={hasEvents ? { cursor: 'pointer' } : {}}>
                      <span className="calendar-day__number">{cell.day}</span>
                      {hasEvents && (
                        <div className="calendar-day__events">
                          {cell.dayEvents.slice(0, 2).map(e => <span key={e.title} className="calendar-day__event-chip">{e.title}</span>)}
                          {cell.dayEvents.length > 2 && <span className="calendar-day__more">+{cell.dayEvents.length - 2} more</span>}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="calendar-legend">
                <span className="calendar-legend__item"><span className="calendar-legend__dot calendar-legend__dot--today" />Today ({today.toLocaleDateString()})</span>
                <span className="calendar-legend__item"><span className="calendar-legend__dot calendar-legend__dot--event" />Event Date</span>
              </div>
              {calendarEvents.length === 0 && <div className="calendar-empty-state">No events scheduled for {monthNames[displayedMonthIndex]} {displayedMonthYear}.</div>}
            </div>
          )}
        </div>
      </section>

      <EventSubscribeForm upcomingEvents={upcomingEvents} />
    </>
  )
}
