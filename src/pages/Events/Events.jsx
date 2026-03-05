import { SectionHeader } from '../../components/common'
import './Events.css'

const Events = () => {
  const events = [
    { title: 'Upper Room Week', date: 'Coming Soon', description: 'A week of intensive programs for young people', location: 'FGC Mgbuoba' },
    { title: 'Youth Camp', date: 'Annual', description: 'Fellowship, fun, and spiritual renewal', location: 'Foursquare Camp' },
    { title: 'Thanksgiving & Carol', date: 'December', description: "Celebrating God's faithfulness", location: 'FGC Mgbuoba' },
  ]

  return (
    <main className="events-page">
      <section className="page-banner bg-red">
        <div className="container">
          <h1>Events</h1>
          <p>Upcoming programs and activities</p>
        </div>
      </section>
      <section className="events-section">
        <div className="container">
          <SectionHeader tag="Upcoming" title="Our Events" />
          <div className="events-grid">
            {events.map((event, i) => (
              <div key={i} className="event-card">
                <div className="event-card__date">{event.date}</div>
                <h3>{event.title}</h3>
                <p>{event.description}</p>
                <span className="event-card__location">📍 {event.location}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

export default Events
