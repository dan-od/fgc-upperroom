import { SectionHeader } from '../../components/common'
import './Testimonies.css'

const Testimonies = () => {
  const testimonies = [
    { name: 'Member Name', quote: 'God has been faithful in my life through Upper Room. The fellowship and teachings have transformed my walk with God.', role: 'Youth Member' },
    { name: 'Member Name', quote: 'I found my purpose and calling here. The mentorship program helped me discover my gifts and how to use them for God.', role: 'Youth Member' },
    { name: 'Member Name', quote: 'The fellowship changed my walk with God. I came as a visitor and found a family that truly cares.', role: 'Youth Member' },
  ]

  return (
    <main className="testimonies-page">
      <section className="page-banner bg-purple">
        <div className="container">
          <h1>Testimonies</h1>
          <p>Stories of God's faithfulness</p>
        </div>
      </section>
      <section className="testimonies-section">
        <div className="container">
          <SectionHeader tag="Praise Reports" title="What God Is Doing" />
          <div className="testimonies-grid">
            {testimonies.map((t, i) => (
              <div key={i} className="testimony-card">
                <blockquote>"{t.quote}"</blockquote>
                <div className="testimony-author">
                  <div className="testimony-avatar">{t.name.charAt(0)}</div>
                  <div>
                    <strong>{t.name}</strong>
                    <span>{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

export default Testimonies
