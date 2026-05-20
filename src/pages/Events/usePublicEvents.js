import { useState, useEffect, useRef } from 'react'
import {
  normalizeRegistrationMethods,
  fetchBotEvents,
  mapBotEventToPublicEvent
} from '../../utils/eventsApi'
import { toAssetUrl } from '../../utils/appPaths'

const DEFAULT_EVENT_IMAGE = toAssetUrl('assets/media/pictures/Senior Pastor_Home.jpeg')

export const toWhatsAppLink = (phone) => {
  const digits = String(phone || '').replace(/\D/g, '')
  return digits ? `https://wa.me/${digits}` : ''
}

export const getWhatToExpectText = (event) => {
  const tags = Array.isArray(event?.whatToExpect) ? event.whatToExpect.filter(Boolean) : []
  if (tags.length === 0) return event?.description || 'Details coming soon.'
  return tags.map((tag) => `\`${tag}\``).join(', ')
}

export const getRegistrationOptions = (event) => {
  if (!event?.registrationRequired) {
    return [{ label: 'Register for Free', href: event?.registrationLink || '/contact' }]
  }

  const options = []
  const methods = normalizeRegistrationMethods(event?.registrationMethods)
  const whatsappHref = toWhatsAppLink(methods.whatsapp.phone)

  if (methods.whatsapp.enabled && whatsappHref) {
    options.push({ label: methods.whatsapp.label, href: whatsappHref })
  }
  if (methods.payment.enabled && /^https?:\/\//i.test(methods.payment.url)) {
    options.push({ label: methods.payment.label, href: methods.payment.url })
  }
  if (options.length === 0) {
    options.push({ label: 'Register for Free', href: event?.registrationLink || '/contact' })
  }

  return options
}

export default function usePublicEvents() {
  const [events, setEvents] = useState([])
  const [countdown, setCountdown] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 })
  const [featuredIndex, setFeaturedIndex] = useState(0)
  const [contentFlipState, setContentFlipState] = useState('idle')
  const [isMobile, setIsMobile] = useState(false)
  const [gridCarouselIndex, setGridCarouselIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(true)

  // Detect mobile viewport
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Load events from bot API
  useEffect(() => {
    const loadEvents = async () => {
      try {
        const botEvents = await fetchBotEvents()
        setEvents(botEvents.map(mapBotEventToPublicEvent))
      } catch {
        setEvents([])
      }
    }

    loadEvents()
    const handleRefresh = () => loadEvents()
    window.addEventListener('adminEventsUpdated', handleRefresh)
    return () => window.removeEventListener('adminEventsUpdated', handleRefresh)
  }, [])

  const today = new Date()
  const sortedEvents = [...events].sort((a, b) => a.startDate - b.startDate)
  const upcomingEvents = sortedEvents
    .filter(event => event.startDate >= today)
    .sort((a, b) => a.startDate - b.startDate)
  const featuredEvents = (upcomingEvents.length > 0 ? upcomingEvents : sortedEvents).slice(0, 3)
  const baseEvent = featuredEvents.length > 0
    ? featuredEvents[featuredIndex % featuredEvents.length]
    : sortedEvents[0]
  const featuredEvent = baseEvent
    ? { ...baseEvent, subtitle: baseEvent.category || 'Featured Event', registrationLink: baseEvent.registrationLink || '/contact' }
    : null

  // Featured event rotation timer
  useEffect(() => {
    if (featuredEvents.length <= 1) return
    const rotateInterval = setInterval(() => setContentFlipState('out'), 10000)
    return () => clearInterval(rotateInterval)
  }, [featuredEvents.length])

  useEffect(() => {
    if (contentFlipState !== 'out' || featuredEvents.length <= 1) return
    const swapTimer = setTimeout(() => {
      setFeaturedIndex((prev) => (prev + 1) % featuredEvents.length)
      setContentFlipState('in')
    }, 150)
    const resetTimer = setTimeout(() => setContentFlipState('idle'), 500)
    return () => { clearTimeout(swapTimer); clearTimeout(resetTimer) }
  }, [contentFlipState, featuredEvents.length])

  // Countdown timer for featured event
  useEffect(() => {
    if (!featuredEvent?.startDate) {
      setCountdown({ days: 0, hours: 0, minutes: 0, seconds: 0 })
      return
    }
    const targetDate = new Date(featuredEvent.startDate).getTime()
    const interval = setInterval(() => {
      const distance = targetDate - new Date().getTime()
      setCountdown({
        days: Math.floor(distance / (1000 * 60 * 60 * 24)),
        hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((distance % (1000 * 60)) / 1000)
      })
    }, 1000)
    return () => clearInterval(interval)
  }, [featuredEvent?.startDate])

  // Carousel auto-rotation
  const startCarouselAutoRotation = (filteredLength, viewMode) => {
    if (viewMode !== 'grid' || filteredLength <= 1) return undefined
    const carouselInterval = setInterval(() => {
      setIsTransitioning(true)
      setGridCarouselIndex((prev) => prev + 1)
    }, 5000)
    return carouselInterval
  }

  // Infinite loop reset
  const handleInfiniteLoopReset = (gridCarouselIndex, filteredLength) => {
    if (gridCarouselIndex === filteredLength) {
      setTimeout(() => {
        setIsTransitioning(false)
        setGridCarouselIndex(0)
        setTimeout(() => setIsTransitioning(true), 50)
      }, 600)
    }
  }

  return {
    events,
    sortedEvents,
    upcomingEvents,
    featuredEvents,
    featuredEvent,
    contentFlipState,
    countdown,
    isMobile,
    gridCarouselIndex,
    setGridCarouselIndex,
    isTransitioning,
    setIsTransitioning,
    startCarouselAutoRotation,
    handleInfiniteLoopReset,
    DEFAULT_EVENT_IMAGE
  }
}
