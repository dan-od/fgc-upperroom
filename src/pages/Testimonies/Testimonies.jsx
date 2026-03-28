import { useEffect, useState } from 'react'
import { SectionHeader } from '../../components/common'
import { BubbleField } from './components/BubbleField'
import { readPublicTestimonies } from '../../utils/testimonyStorage'
import './Testimonies.css'

const Testimonies = () => {
  const [testimonies, setTestimonies] = useState([])

  useEffect(() => {
    let isMounted = true

    const loadTestimonies = async () => {
      try {
        const items = await readPublicTestimonies()
        if (isMounted) {
          setTestimonies(items)
        }
      } catch {
        if (isMounted) {
          setTestimonies([])
        }
      }
    }

    void loadTestimonies()

    return () => {
      isMounted = false
    }
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
        <div className="container text-center testimonies-header">
          <SectionHeader tag="Praise Reports" title="What God Is Doing" />
          <p className="testimonies-header-desc">
            Hover over a bubble to read the full story.
          </p>
        </div>

        <BubbleField source={testimonies} />
      </section>
    </main>
  )
}

export default Testimonies
