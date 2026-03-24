import { useState, useEffect, useRef } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useI18n } from '../../../i18n/LanguageContext'
import './Header.css'

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { t } = useI18n()
  const location = useLocation()
  const navRef = useRef(null)
  const toggleRef = useRef(null)
  const navId = 'primary-navigation'

  const navLinks = [
    { path: '/', label: t('header.nav.home', 'Home') },
    { path: '/about', label: t('header.nav.about', 'About') },
    { path: '/team', label: t('header.nav.team', 'Team') },
    { path: '/events', label: t('header.nav.events', 'Events') },
    { path: '/media', label: t('header.nav.media', 'Media') },
    { path: '/blog', label: t('header.nav.blog', 'Blog') },
    { path: '/contact', label: t('header.nav.contact', 'Contact') }
  ]

  useEffect(() => {
    const handleScroll = () => {
      // On homepage, show header after hero (100vh)
      // On other pages, always show
      const threshold = location.pathname === '/' ? window.innerHeight - 100 : 0
      setIsScrolled(window.scrollY > threshold)
    }

    handleScroll()
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [location.pathname])

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location])

  useEffect(() => {
    if (!mobileMenuOpen) {
      document.body.classList.remove('modal-open')
      return
    }

    document.body.classList.add('modal-open')

    const focusTimer = window.setTimeout(() => {
      const firstLink = navRef.current?.querySelector('a')
      firstLink?.focus()
    }, 60)

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false)
        toggleRef.current?.focus()
      }
    }

    document.addEventListener('keydown', handleEscape)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleEscape)
      document.body.classList.remove('modal-open')
    }
  }, [mobileMenuOpen])

  return (
    <header className={`header ${isScrolled ? 'header--visible' : ''} ${location.pathname !== '/' ? 'header--always' : ''}`}>
      <div className="header__container">
        <Link to="/" className="header__logo">
          <img src="./assets/logos/logo-color.png" alt="Foursquare Logo" className="header__logo-mark" />
          <span className="header__logo-divider" aria-hidden="true"></span>
          <div className="header__logo-text">
            <img src="./assets/logos/upper_left_align_black.png" alt="Upper Room" className="header__logo-title" />
          </div>
        </Link>

        <nav
          id={navId}
          ref={navRef}
          aria-label={t('header.primaryNavigation', 'Primary navigation')}
          className={`header__nav ${mobileMenuOpen ? 'header__nav--open' : ''}`}
        >
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`header__link ${location.pathname === link.path ? 'header__link--active' : ''}`}
              aria-current={location.pathname === link.path ? 'page' : undefined}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {mobileMenuOpen && (
          <button
            type="button"
            className="header__backdrop"
            aria-label={t('header.closeBackdrop', 'Close menu')}
            onClick={() => setMobileMenuOpen(false)}
          />
        )}

        <button
          ref={toggleRef}
          type="button"
          className={`header__mobile-toggle ${mobileMenuOpen ? 'header__mobile-toggle--active' : ''}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label={mobileMenuOpen ? t('header.closeMenu', 'Close menu') : t('header.openMenu', 'Open menu')}
          aria-expanded={mobileMenuOpen}
          aria-controls={navId}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>
    </header>
  )
}

export default Header
