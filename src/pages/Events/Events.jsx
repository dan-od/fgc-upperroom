import { useState, useRef } from 'react'
import { Helmet } from 'react-helmet-async'
import { Button } from '../../components/common'
import usePublicEvents, { getRegistrationOptions, getWhatToExpectText } from './usePublicEvents'
import EventCountdown from './EventCountdown'
import EventModal from './EventModal'
import EventGrid from './EventGrid'
import './Events.css'

export default function Events() {
  const {
    sortedEvents,
    featuredEvent,
    contentFlipState,
    countdown,
    isMobile,
    gridCarouselIndex,
    setGridCarouselIndex,
    isTransitioning,
    setIsTransitioning,
    startCarouselAutoRotation,
    handleInfiniteLoopReset
  } = usePublicEvents()

  const [selectedEvent, setSelectedEvent] = useState(null)
  const activeModalTriggerRef = useRef(null)

  const openEventModal = (event, triggerEl = null) => {
    activeModalTriggerRef.current = triggerEl
    setSelectedEvent(event)
  }

  const closeEventModal = () => {
    setSelectedEvent(null)
    requestAnimationFrame(() => activeModalTriggerRef.current?.focus())
  }

  const featuredRegistrationOptions = featuredEvent ? getRegistrationOptions(featuredEvent) : []

  return (
    <main id="main-content" className="events-page">
      <Helmet>
        <title>Events — FGC Upper Room Mgbuoba</title>
        <meta name="description" content="Upcoming events at FGC Upper Room Mgbuoba — services, youth programs, and special gatherings. Stay connected and never miss out." />
        <meta property="og:title" content="Events — FGC Upper Room Mgbuoba" />
        <meta property="og:description" content="See upcoming events and services at Upper Room Mgbuoba youth fellowship." />
        <meta property="og:image" content="https://fgcmgbuoba.org/fgc-testing/assets/media/pictures/IMG_1769.webp" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fgcmgbuoba.org/fgc-testing/events" />
      </Helmet>
      <section className="page-banner bg-red">
        <div className="container">
          <h1>Events</h1>
          <p>Upcoming programs and activities</p>
        </div>
      </section>

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
                  {featuredEvent.subtitle.split(',').map((cat, idx) => <code key={idx}>{cat.trim()}</code>)}
                </p>
                <EventCountdown countdown={countdown} />
                <p className="featured-event__description">{getWhatToExpectText(featuredEvent)}</p>
                <div className="featured-event__details">
                  <div className="featured-event__detail"><i className="fa-solid fa-calendar"></i><span>{featuredEvent.date}</span></div>
                  <div className="featured-event__detail"><i className="fa-solid fa-clock"></i><span>{featuredEvent.time}</span></div>
                  <div className="featured-event__detail"><i className="fa-solid fa-location-dot"></i><span>{featuredEvent.location}</span></div>
                  <div className="featured-event__detail"><i className="fa-solid fa-ticket"></i><span>{featuredEvent.price}</span></div>
                </div>
                <div className="featured-event__registration-actions">
                  {featuredRegistrationOptions.map((option, index) => (
                    <Button key={`${option.label}-${index}`} href={option.href} variant={index === 0 ? 'primary' : 'outline'} size="lg" external={option.href.startsWith('http')} target={option.href.startsWith('http') ? '_blank' : undefined} rel={option.href.startsWith('http') ? 'noopener noreferrer' : undefined}>
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
                <p className="featured-event__description">Upcoming events will appear here as soon as they are created in the Admin dashboard.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <EventGrid
        events={sortedEvents}
        sortedEvents={sortedEvents}
        isMobile={isMobile}
        gridCarouselIndex={gridCarouselIndex}
        setGridCarouselIndex={setGridCarouselIndex}
        isTransitioning={isTransitioning}
        setIsTransitioning={setIsTransitioning}
        startCarouselAutoRotation={startCarouselAutoRotation}
        handleInfiniteLoopReset={handleInfiniteLoopReset}
        onSelectEvent={openEventModal}
      />

      {selectedEvent && (
        <EventModal event={selectedEvent} onClose={closeEventModal} />
      )}
    </main>
  )
}
