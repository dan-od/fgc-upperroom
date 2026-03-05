import { useState, useEffect } from 'react'
import './Testimonials.css'

const testimonials = [
  {
    id: 1,
    quote: "Upper Room has transformed my walk with God. The fellowship here is genuine and the teachings are life-changing.",
    name: "Member Name",
    role: "Youth Member"
  },
  {
    id: 2,
    quote: "I found my purpose and calling through the mentorship and discipleship programs here. This is truly a family.",
    name: "Member Name",
    role: "Youth Member"
  },
  {
    id: 3,
    quote: "The worship experience and the word of God shared every week keeps me coming back. God is doing great things!",
    name: "Member Name",
    role: "Youth Member"
  }
]

const Testimonials = () => {
  const [current, setCurrent] = useState(0)

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % testimonials.length)
    }, 5000)
    return () => clearInterval(timer)
  }, [])

  return (
    <section className="testimonials">
      <div className="container">
        <div className="testimonials__content">
          <span className="testimonials__tag">Testimonies</span>
          <h2 className="testimonials__title">What Our Members Say</h2>
          
          <div className="testimonials__slider">
            {testimonials.map((item, index) => (
              <div 
                key={item.id}
                className={`testimonials__item ${index === current ? 'testimonials__item--active' : ''}`}
              >
                <blockquote className="testimonials__quote">
                  "{item.quote}"
                </blockquote>
                <div className="testimonials__author">
                  <div className="testimonials__avatar">
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <p className="testimonials__name">{item.name}</p>
                    <p className="testimonials__role">{item.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          <div className="testimonials__dots">
            {testimonials.map((_, index) => (
              <button
                key={index}
                className={`testimonials__dot ${index === current ? 'testimonials__dot--active' : ''}`}
                onClick={() => setCurrent(index)}
                aria-label={`Go to testimonial ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

export default Testimonials
