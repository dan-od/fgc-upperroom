import { useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { hasSubscribed } from '../../utils/subscribeApi'
import ServiceBar from '../../components/layout/ServiceBar/ServiceBar'
import { FoursquareIcons, Testimonials } from '../../components/features'
import HeroSection from './HeroSection'
import PastorWelcome from './PastorWelcome'
import WhatWeBelieve from './WhatWeBelieve'
import NewHere from './NewHere'
import SocialMedia from './SocialMedia'
import NewsletterModal from './NewsletterModal'
import './Home.css'

export default function Home() {
  const location = useLocation()
  const [showNewsletter, setShowNewsletter] = useState(false)

  useEffect(() => {
    const params = new URLSearchParams(location.search)

    // If the URL explicitly requests the newsletter, show it immediately.
    if (params.get('subscribe') === 'true' && !hasSubscribed()) {
      setShowNewsletter(true)
      sessionStorage.setItem('newsletterModalShown', 'true')
    }

    // Never show popup if this browser/device already subscribed
    if (hasSubscribed()) return

    // Also skip if already shown in this tab session
    if (sessionStorage.getItem('newsletterModalShown')) return

    // Trigger 1: Show modal after 30 seconds on page
    const timeoutId = setTimeout(() => {
      if (!hasSubscribed() && !sessionStorage.getItem('newsletterModalShown')) {
        setShowNewsletter(true)
        sessionStorage.setItem('newsletterModalShown', 'true')
      }
    }, 30000)

    // Trigger 2: Show modal on 50% scroll
    const handleScroll = () => {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight - window.innerHeight
      const scrollPercent = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0
      if (scrollPercent > 50 && !hasSubscribed() && !sessionStorage.getItem('newsletterModalShown')) {
        setShowNewsletter(true)
        sessionStorage.setItem('newsletterModalShown', 'true')
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => {
      clearTimeout(timeoutId)
      window.removeEventListener('scroll', handleScroll)
    }
  }, [location.search])

  const handleCloseNewsletter = () => setShowNewsletter(false)

  return (
    <main id="main-content" className="home-page">
      <Helmet>
        <title>FGC Upper Room Mgbuoba — Raising Kingdom Youth</title>
        <meta name="description" content="Youth Fellowship of Foursquare Gospel Church Mgbuoba Zonal HQ, Port Harcourt. Join us for Sunday services, events, and community." />
        <meta property="og:title" content="FGC Upper Room Mgbuoba — Raising Kingdom Youth" />
        <meta property="og:description" content="Youth Fellowship of Foursquare Gospel Church Mgbuoba, Port Harcourt. Join us for Sunday services, events, and community." />
        <meta property="og:image" content="https://fgcmgbuoba.org/fgc-testing/assets/media/pictures/IMG_1769.webp" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fgcmgbuoba.org/fgc-testing/" />
      </Helmet>
      <NewsletterModal isOpen={showNewsletter} onClose={handleCloseNewsletter} />
      <HeroSection />
      <ServiceBar />
      <PastorWelcome />
      <WhatWeBelieve />
      <NewHere />
      <FoursquareIcons />
      <Testimonials />
      <SocialMedia />
    </main>
  )
}
