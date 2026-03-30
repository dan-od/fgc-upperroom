import React, { forwardRef } from 'react'
import { Quote } from 'lucide-react'

export const Bubble = forwardRef(({ testimony, onMouseEnter, onMouseLeave, color }, ref) => {
  return (
    <div
      ref={ref}
      className="testimony-bubble"
      style={{
        width: '260px',
        height: '260px',
        willChange: 'transform',
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <Quote className="testimony-bubble__quote-icon" />
      <p className="testimony-bubble__quote">
        "{testimony.quote}"
      </p>
      <div className="testimony-bubble__author-info">
        <span className="testimony-bubble__name">{testimony.name}</span>
        <span className="testimony-bubble__role">{testimony.role}</span>
      </div>
    </div>
  )
})

Bubble.displayName = 'Bubble'
