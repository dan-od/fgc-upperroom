import { useEffect, useRef, useState } from 'react'
import { Bubble } from './Bubble'

const BUBBLE_COUNT = 12
const BASE_RADIUS = 130 // Half of 260px width/height

// Map first char to one of the brand colours
const AVATAR_COLORS = ['#8a161e', '#d4a82e', '#2d3a7a', '#5a4494']
const avatarColor = (name = '') => AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]

function pickRandom(arr, n) {
  const shuffled = [...arr].sort(() => Math.random() - 0.5)
  return shuffled.slice(0, Math.min(n, shuffled.length))
}

export const BubbleField = ({ source }) => {
  const containerRef = useRef(null)
  const bubblesRef = useRef([])
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const hoveredIdRef = useRef(null)
  
  const [activeTestimonies, setActiveTestimonies] = useState([])

  useEffect(() => {
    if (!source.length) return
    setActiveTestimonies(pickRandom(source, BUBBLE_COUNT))
  }, [source])

  // Initialize physics state
  const physicsState = useRef([])

  useEffect(() => {
    if (!activeTestimonies.length) return
    physicsState.current = activeTestimonies.map((t) => {
      const startX = BASE_RADIUS + Math.random() * (typeof window !== 'undefined' ? window.innerWidth - BASE_RADIUS * 2 : 800)
      const startY = BASE_RADIUS + Math.random() * (typeof window !== 'undefined' ? 500 - BASE_RADIUS * 2 : 600)
      
      return {
        id: t.id,
        x: startX,
        y: Math.max(BASE_RADIUS, startY),
        vx: (Math.random() - 0.5) * 1.5,
        vy: (Math.random() - 0.5) * 1.5,
        baseRadius: BASE_RADIUS,
        currentRadius: BASE_RADIUS,
        color: avatarColor(t.name)
      }
    })
  }, [activeTestimonies])

  useEffect(() => {
    if (!activeTestimonies.length) return
    let animationFrameId

    const loop = () => {
      const width = containerRef.current?.clientWidth || window.innerWidth
      const height = containerRef.current?.clientHeight || window.innerHeight
      const state = physicsState.current
      const mouse = mouseRef.current
      const hoveredId = hoveredIdRef.current

      // 1. Update positions and handle wall collisions
      for (let i = 0; i < state.length; i++) {
        const p = state[i]

        // Target radius based on hover state
        const targetRadius = hoveredId === p.id ? p.baseRadius * 1.05 : p.baseRadius
        p.currentRadius += (targetRadius - p.currentRadius) * 0.15

        if (hoveredId !== p.id) {
          // Apply velocity
          p.x += p.vx
          p.y += p.vy

          // Mouse repulsion
          const dx = p.x - mouse.x
          const dy = p.y - mouse.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 300 && dist > 0) {
            const force = (300 - dist) / 300
            p.vx += (dx / dist) * force * 0.6
            p.vy += (dy / dist) * force * 0.6
          }

          // Constant gentle acceleration to keep them moving
          const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy)
          if (speed < 0.3) {
            p.vx += (Math.random() - 0.5) * 0.1
            p.vy += (Math.random() - 0.5) * 0.1
          } else if (speed > 2.5) {
            // Dampen if going too fast
            p.vx *= 0.95
            p.vy *= 0.95
          }

          // Bounce off walls
          if (p.x - p.currentRadius < 0) { 
            p.x = p.currentRadius 
            p.vx = Math.abs(p.vx) 
          }
          if (p.x + p.currentRadius > width) { 
            p.x = width - p.currentRadius 
            p.vx = -Math.abs(p.vx) 
          }
          if (p.y - p.currentRadius < 0) { 
            p.y = p.currentRadius 
            p.vy = Math.abs(p.vy) 
          }
          if (p.y + p.currentRadius > height) { 
            p.y = height - p.currentRadius 
            p.vy = -Math.abs(p.vy) 
          }
        } else {
          // Dampen velocity heavily when hovered so it freezes in place
          p.vx *= 0.5
          p.vy *= 0.5
        }
      }

      // 2. Handle bubble-to-bubble collisions
      for (let i = 0; i < state.length; i++) {
        for (let j = i + 1; j < state.length; j++) {
          const p1 = state[i]
          const p2 = state[j]
          const dx = p2.x - p1.x
          const dy = p2.y - p1.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          const minDist = p1.currentRadius + p2.currentRadius + 10 // 10px padding

          if (dist < minDist && dist > 0) {
            const angle = Math.atan2(dy, dx)
            const overlap = minDist - dist
            
            // Separate them immediately to prevent sticking
            const separationX = Math.cos(angle) * (overlap / 2)
            const separationY = Math.sin(angle) * (overlap / 2)

            if (hoveredId !== p1.id && hoveredId !== p2.id) {
              p1.x -= separationX
              p1.y -= separationY
              p2.x += separationX
              p2.y += separationY
            } else if (hoveredId === p1.id) {
              p2.x += separationX * 2
              p2.y += separationY * 2
            } else if (hoveredId === p2.id) {
              p1.x -= separationX * 2
              p1.y -= separationY * 2
            }

            // Apply bounce force
            const force = overlap * 0.02
            const fx = Math.cos(angle) * force
            const fy = Math.sin(angle) * force

            if (hoveredId !== p1.id) {
              p1.vx -= fx
              p1.vy -= fy
            }
            if (hoveredId !== p2.id) {
              p2.vx += fx
              p2.vy += fy
            }
          }
        }
      }

      // 3. Update DOM elements
      for (let i = 0; i < state.length; i++) {
        const el = bubblesRef.current[i]
        if (el) {
          const p = state[i]
          const scale = p.currentRadius / p.baseRadius
          
          // Use translate3d for hardware acceleration
          el.style.transform = `translate3d(${p.x - p.baseRadius}px, ${p.y - p.baseRadius}px, 0) scale(${scale})`
          
          // Bring hovered bubble to the front
          el.style.zIndex = hoveredId === p.id ? '10' : '1'
        }
      }

      animationFrameId = requestAnimationFrame(loop)
    }

    loop()

    // Handle window resize to keep bubbles inside
    const handleResize = () => {
      const width = containerRef.current?.clientWidth || window.innerWidth
      const height = containerRef.current?.clientHeight || window.innerHeight
      physicsState.current.forEach(p => {
        if (p.x > width - p.baseRadius) p.x = width - p.baseRadius
        if (p.y > height - p.baseRadius) p.y = height - p.baseRadius
      })
    }

    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [activeTestimonies])

  if (!activeTestimonies.length) {
    return (
      <div className="testimonies-empty">
        <p>No testimonies have been added yet.</p>
      </div>
    )
  }

  return (
    <div 
      ref={containerRef} 
      className="testimonies-arena"
      onMouseMove={(e) => {
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
        }
      }}
      onMouseLeave={() => {
        mouseRef.current = { x: -1000, y: -1000 }
      }}
    >
      {activeTestimonies.map((t, i) => (
        <Bubble 
          key={t.id}
          testimony={t}
          color={physicsState.current[i]?.color || '#000'}
          ref={(el) => (bubblesRef.current[i] = el)}
          onMouseEnter={() => (hoveredIdRef.current = t.id)}
          onMouseLeave={() => {
            if (hoveredIdRef.current === t.id) hoveredIdRef.current = null
          }}
        />
      ))}
    </div>
  )
}
