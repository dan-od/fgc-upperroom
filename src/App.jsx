import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom'
import Header from './components/layout/Header/Header'
import ScrollToTop from './components/layout/ScrollToTop/ScrollToTop'
import { FeedbackProvider, LoadingScreen } from './components/common'
import { useI18n } from './i18n/LanguageContext'
import { applyLiteralTranslations } from './i18n/literalTranslations'
import { APP_BASENAME } from './utils/appPaths'

// Pages
const Home = lazy(() => import('./pages/Home/Home'))
const About = lazy(() => import('./pages/About/About'))
const Team = lazy(() => import('./pages/Team/Team'))
const Events = lazy(() => import('./pages/Events/Events'))
const Media = lazy(() => import('./pages/Media/Media'))
const Live = lazy(() => import('./pages/Live/Live'))
const Giving = lazy(() => import('./pages/Giving/Giving'))
const Blog = lazy(() => import('./pages/Blog/Blog'))
const Contact = lazy(() => import('./pages/Contact/Contact'))
const Testimonies = lazy(() => import('./pages/Testimonies/Testimonies'))
const Privacy = lazy(() => import('./pages/Privacy/Privacy'))
const Admin = lazy(() => import('./pages/Admin/Admin'))
const NotFound = lazy(() => import('./pages/NotFound/NotFound'))
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
  const { language } = useI18n()

  useEffect(() => {
    const applyHeroPrimary = () => {
      const heroPrimary = resolveHeroPrimary() || DEFAULT_HERO_PRIMARY
      document.documentElement.style.setProperty('--hero-primary', heroPrimary)
    }

    applyHeroPrimary()
    const rafId = requestAnimationFrame(applyHeroPrimary)

    return () => cancelAnimationFrame(rafId)
  }, [location.pathname])

  useEffect(() => {
    if (typeof document === 'undefined') return undefined

    const root = document.getElementById('root') || document.body
    if (!root) return undefined

    let timeoutId = 0
    let isApplying = false
    const translationLanguage = location.pathname.startsWith('/admin') ? 'en' : language

    const runTranslationPass = () => {
      if (isApplying) return
      isApplying = true
      applyLiteralTranslations({ language: translationLanguage, root })
      isApplying = false
    }

    const debouncedRun = () => {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        requestAnimationFrame(runTranslationPass)
      }, 100)
    }

    debouncedRun()

    const observer = new MutationObserver(debouncedRun)

    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['placeholder', 'title', 'aria-label']
    })

    return () => {
      observer.disconnect()
      if (timeoutId) clearTimeout(timeoutId)
    }
  }, [language, location.pathname])

  return null
}

function App() {
  const { t } = useI18n()

  const routeFallback = (
    <LoadingScreen label={t('common.loading', 'Loading...')} />
  )

  return (
    <FeedbackProvider>
      <BrowserRouter basename={APP_BASENAME}>
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
                    <Route path="/live" element={<Live />} />
                    <Route path="/giving" element={<Giving />} />
                    <Route path="/blog" element={<Blog />} />
                    <Route path="/contact" element={<Contact />} />
                    <Route path="/testimonies" element={<Testimonies />} />
                    <Route path="/privacy" element={<Privacy />} />
                    <Route path="*" element={<NotFound />} />
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
    </FeedbackProvider>
  )
}

export default App
