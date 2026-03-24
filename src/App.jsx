import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/layout/Header/Header'
import ScrollToTop from './components/layout/ScrollToTop/ScrollToTop'
import { useI18n } from './i18n/LanguageContext'

// Pages
const Home = lazy(() => import('./pages/Home/Home'))
const About = lazy(() => import('./pages/About/About'))
const Team = lazy(() => import('./pages/Team/Team'))
const Events = lazy(() => import('./pages/Events/Events'))
const Media = lazy(() => import('./pages/Media/Media'))
const Blog = lazy(() => import('./pages/Blog/Blog'))
const Contact = lazy(() => import('./pages/Contact/Contact'))
const Testimonies = lazy(() => import('./pages/Testimonies/Testimonies'))
const Admin = lazy(() => import('./pages/Admin/Admin'))
const Footer = lazy(() => import('./components/layout/Footer/Footer'))

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
  const { t } = useI18n()

  const routeFallback = (
    <div style={{ minHeight: '40vh', display: 'grid', placeItems: 'center', color: '#6b7280' }}>
      {t('common.loading', 'Loading...')}
    </div>
  )

  return (
    <BrowserRouter basename="/fgc-testing/">
      <RouteScrollbarTheme />
      <ScrollToTop />
      <Routes>
        {/* Admin Route - No Header/Footer */}
        <Route
          path="/admin"
          element={
            <Suspense fallback={routeFallback}>
              <Admin />
            </Suspense>
          }
        />

        {/* Public Routes - With Header/Footer */}
        <Route
          path="/*"
          element={
            <>
              <a className="skip-link" href="#main-content">
                {t('common.skipToMainContent', 'Skip to main content')}
              </a>
              <Header />
              <Suspense fallback={routeFallback}>
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
              </Suspense>
              <Suspense fallback={null}>
                <Footer />
              </Suspense>
            </>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
