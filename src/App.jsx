import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import { Header, Footer, ScrollToTop } from './components/layout'

// Pages
import Home from './pages/Home/Home'
import About from './pages/About/About'
import Team from './pages/Team/Team'
import Events from './pages/Events/Events'
import Media from './pages/Media/Media'
import Blog from './pages/Blog/Blog'
import Contact from './pages/Contact/Contact'
import Testimonies from './pages/Testimonies/Testimonies'
import Admin from './pages/Admin/Admin'

const DEFAULT_HERO_PRIMARY = 'var(--cup-blue)'

const resolveHeroPrimary = () => {
  const pageRoot = document.querySelector('main[class*="-page"], main.admin-main')
  if (!pageRoot) return null

  const heroPrimary = getComputedStyle(pageRoot).getPropertyValue('--hero-primary').trim()
  return heroPrimary || null
}

const RouteScrollbarTheme = () => {
  const location = useLocation()

  useEffect(() => {
    const applyHeroPrimary = () => {
      const heroPrimary = resolveHeroPrimary() || DEFAULT_HERO_PRIMARY
      document.documentElement.style.setProperty('--hero-primary', heroPrimary)
    }

    applyHeroPrimary()
    const rafId = requestAnimationFrame(applyHeroPrimary)

    return () => cancelAnimationFrame(rafId)
  }, [location.pathname])

  return null
}

function App() {
  return (
    <BrowserRouter basename="/fgc-testing/">
      <RouteScrollbarTheme />
      <ScrollToTop />
      <Routes>
        {/* Admin Route - No Header/Footer */}
        <Route path="/admin" element={<Admin />} />

        {/* Public Routes - With Header/Footer */}
        <Route path="/*" element={
          <>
            <Header />
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/about" element={<About />} />
              <Route path="/team" element={<Team />} />
              <Route path="/events" element={<Events />} />
              <Route path="/media" element={<Media />} />
              <Route path="/blog" element={<Blog />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/testimonies" element={<Testimonies />} />
            </Routes>
            <Footer />
          </>
        } />
      </Routes>
    </BrowserRouter>
  )
}

export default App
