import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Header.css'

const Header = () => {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const location = useLocation()

  const navLinks = [
    { path: '/', label: 'Home' },
    { path: '/about', label: 'About' },
    { path: '/team', label: 'Team' },
    { path: '/events', label: 'Events' },
    { path: '/media', label: 'Media' },
    { path: '/contact', label: 'Contact' },
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

  return (
    <header className={`header ${isScrolled ? 'header--visible' : ''} ${location.pathname !== '/' ? 'header--always' : ''}`}>
      <div className="header__container">
        <Link to="/" className="header__logo">
          <img src="./assets/logos/logo-color.png" alt="Foursquare Logo" />
          <div className="header__logo-text">
            <span className="header__logo-title">Upper Room</span>
            <span className="header__logo-sub">Mgbuoba</span>
          </div>
        </Link>

        <nav className={`header__nav ${mobileMenuOpen ? 'header__nav--open' : ''}`}>
          {navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`header__link ${location.pathname === link.path ? 'header__link--active' : ''}`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <button
          className={`header__mobile-toggle ${mobileMenuOpen ? 'header__mobile-toggle--active' : ''}`}
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          aria-label="Toggle menu"
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
