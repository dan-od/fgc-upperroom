import { useEffect, useState } from 'react'
import { SectionHeader } from '../../components/common'
import { readTestimonies } from '../../utils/testimonyStorage'
import './Testimonies.css'

const Testimonies = () => {
  const [testimonies, setTestimonies] = useState([])

  useEffect(() => {
    setTestimonies(readTestimonies({ fallbackToDefaultOnEmpty: true }))
  }, [])

  return (
    <main id="main-content" className="testimonies-page">
      <section className="page-banner bg-purple">
        <div className="container">
          <h1>Testimonies</h1>
          <p>Stories of God's faithfulness</p>
        </div>
      </section>
      <section className="testimonies-section">
        <div className="container">
          <SectionHeader tag="Praise Reports" title="What God Is Doing" />
          {testimonies.length === 0 ? (
            <div className="testimonies-empty">
              <p>No testimonies have been added yet. Check back soon or add one via the Admin panel.</p>
            </div>
          ) : (
            <div className="testimonies-grid">
              {testimonies.map((t) => (
                <div key={t.id} className="testimony-card">
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
          )}
        </div>
      </section>
    </main>
  )
}

export default Testimonies
