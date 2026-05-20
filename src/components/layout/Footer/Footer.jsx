import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { FacebookIcon, InstagramIcon, YoutubeIcon, TwitterIcon, TikTokIcon } from '../../common/SocialIcons'
import { subscribeEmail } from '../../../utils/newsletterApi'
import { useI18n } from '../../../i18n/LanguageContext'
import { toAssetUrl } from '../../../utils/appPaths'
import './Footer.css'

const FOOTER_ASSETS = {
  cross: toAssetUrl('assets/icons/icon-cross.png'),
  dove: toAssetUrl('assets/icons/icon-dove.png'),
  cup: toAssetUrl('assets/icons/icon-cup.png'),
  crown: toAssetUrl('assets/icons/icon-crown.png'),
  wordmark: toAssetUrl('assets/logos/upper_left_align_white.png')
}

const Footer = () => {
  const { t, language, setLanguage, languages } = useI18n()
  const [newsletterForm, setNewsletterForm] = useState({ name: '', email: '' })
  const [newsletterStatus, setNewsletterStatus] = useState(null)
  const [newsletterMessage, setNewsletterMessage] = useState('')
  const [newsletterSubmitting, setNewsletterSubmitting] = useState(false)
  const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false)
  const languageMenuRef = useRef(null)
  const languageTriggerRef = useRef(null)

  const quickLinks = [
    { path: '/', label: t('header.nav.home', 'Home') },
    { path: '/about', label: t('header.nav.about', 'About') },
    { path: '/team', label: t('header.nav.team', 'Team') },
    { path: '/events', label: t('header.nav.events', 'Events') },
    { path: '/media', label: t('header.nav.media', 'Media') },
    { path: '/contact', label: t('header.nav.contact', 'Contact') }
  ]

  const resources = [
    { path: '/blog', label: t('header.nav.blog', 'Blog') },
    { path: '/giving', label: t('header.nav.giving', 'Giving') },
    { path: '/contact?subject=prayer', label: 'Prayer Request' },
    { path: '/testimonies', label: 'Testimonies' }
  ]

  const socialLinks = [
    { Icon: FacebookIcon, label: 'Facebook', url: 'https://web.facebook.com/profile.php?id=61587147628624' },
    { Icon: InstagramIcon, label: 'Instagram', url: 'https://www.instagram.com/theupperroom_4sq/' },
    { Icon: YoutubeIcon, label: 'YouTube', url: 'https://youtube.com/@theupperroom_4sq?si=mDSHkd21JpLiDmwC' },
    { Icon: TwitterIcon, label: 'X', url: 'https://x.com/Upperroom_4sq' },
    { Icon: TikTokIcon, label: 'TikTok', url: 'https://www.tiktok.com/@theupperroom_4sq' }
  ]

  const handleNewsletterChange = (e) => {
    const { name, value } = e.target
    setNewsletterForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleNewsletterSubmit = async (e) => {
    e.preventDefault()
    setNewsletterStatus(null)

    const name = newsletterForm.name.trim()
    const email = newsletterForm.email.trim()
    if (!name || !email) {
      setNewsletterStatus('error')
      setNewsletterMessage(t('footer.subscribeErrorMissing', 'Please enter your name and email address.'))
      return
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(email)) {
      setNewsletterStatus('error')
      setNewsletterMessage(t('footer.subscribeErrorInvalidEmail', 'Enter a valid email address.'))
      return
    }

    setNewsletterSubmitting(true)

    try {
      const result = await subscribeEmail({
        name,
        email,
        source: 'footer-newsletter'
      })

      setNewsletterStatus('success')
      setNewsletterMessage(result?.message || t('footer.subscribeSuccessFallback', 'You are subscribed for event email updates.'))
      setNewsletterForm({ name: '', email: '' })
    } catch {
      setNewsletterStatus('error')
      setNewsletterMessage(t('footer.subscribeErrorFallback', 'Unable to subscribe right now. Please try again shortly.'))
    } finally {
      setNewsletterSubmitting(false)
    }
  }

  useEffect(() => {
    if (!isLanguageMenuOpen) return undefined

    const handleClickOutside = (event) => {
      if (languageMenuRef.current && !languageMenuRef.current.contains(event.target)) {
        setIsLanguageMenuOpen(false)
      }
    }

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        setIsLanguageMenuOpen(false)
        languageTriggerRef.current?.focus()
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isLanguageMenuOpen])

  const activeLanguage = languages.find((item) => item.code === language) || languages[0]

  const handleLanguageSelect = (nextLanguage) => {
    setLanguage(nextLanguage)
    setIsLanguageMenuOpen(false)
    languageTriggerRef.current?.focus()
  }

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__main">
          <section className="footer__brand-column">
            <div className="footer__symbol-row" aria-label="Foursquare symbols">
              <img src={FOOTER_ASSETS.cross} alt="Cross symbol" className="footer__symbol" />
              <img src={FOOTER_ASSETS.dove} alt="Dove symbol" className="footer__symbol" />
              <img src={FOOTER_ASSETS.cup} alt="Cup symbol" className="footer__symbol" />
              <img src={FOOTER_ASSETS.crown} alt="Crown symbol" className="footer__symbol" />
            </div>
            <p className="footer__church-name">{t('footer.churchName', 'THE FOURSQUARE CHURCH')}</p>
            <span className="footer__line" aria-hidden="true"></span>
            <img src={FOOTER_ASSETS.wordmark} alt="The Upperroom" className="footer__wordmark" />
            <p className="footer__tagline">{t('footer.tagline', 'Raising Kingdom Youths!')}</p>
            <p className="footer__description">
              A vibrant youth church under the Foursquare Gospel Church, Mgbuoba Zonal HQ.<br />Raising young people who know God and make Him known.
            </p>

            <div className="footer__socials">
              {socialLinks.map((social) => (
                <a
                  key={social.label}
                  href={social.url}
                  className="footer__social"
                  title={social.label}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <social.Icon size={18} />
                </a>
              ))}
            </div>
          </section>

          <section className="footer__menu-column">
            <div className="footer__section">
              <h4>{t('footer.quickLinks', 'Quick Links')}</h4>
              <ul>
                {quickLinks.map((link) => (
                  <li key={link.path}>
                    <Link to={link.path}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="footer__section">
              <h4>{t('footer.resources', 'Resources')}</h4>
              <ul>
                {resources.map((link) => (
                  <li key={link.label}>
                    <Link to={link.path}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="footer__service-column">
            <div className="footer__section">
              <h4>{t('footer.serviceTimes', 'Service Times')}</h4>
              <ul className="footer__service-times">
                <li>
                  <strong>{t('footer.firstSunday', '1st Sunday:')}</strong>
                  <span>{t('footer.firstSundayTime', 'Communion Service - 7:30 AM')}</span>
                </li>
                <li>
                  <strong>{t('footer.otherSundays', 'Other Sundays:')}</strong>
                  <span>{t('footer.otherSundaysTime', 'Youth Service - 8:00 AM')}</span>
                </li>
                <li>
                  <strong>{t('footer.wednesday', 'Wednesday:')}</strong>
                  <span>{t('footer.wednesdayTime', '5:00 PM (Coming Soon)')}</span>
                </li>
              </ul>
            </div>

            <div className="footer__newsletter">
              <h4>{t('footer.emailUpdates', 'Email Updates')}</h4>
              <p>{t('footer.emailUpdatesDesc', 'Get event communication and ministry updates by email.')}</p>
              <form className="footer__newsletter-form" onSubmit={handleNewsletterSubmit}>
                <label className="sr-only" htmlFor="footer-newsletter-name">{t('footer.yourName', 'Your name')}</label>
                <input
                  id="footer-newsletter-name"
                  type="text"
                  name="name"
                  value={newsletterForm.name}
                  onChange={handleNewsletterChange}
                  className="footer__newsletter-input"
                  placeholder={t('footer.yourName', 'Your name')}
                  autoComplete="name"
                  disabled={newsletterSubmitting}
                  required
                />
                <label className="sr-only" htmlFor="footer-newsletter-email">{t('footer.emailAddress', 'Email address')}</label>
                <input
                  id="footer-newsletter-email"
                  type="email"
                  name="email"
                  value={newsletterForm.email}
                  onChange={handleNewsletterChange}
                  className="footer__newsletter-input"
                  placeholder="you@example.com"
                  autoComplete="email"
                  disabled={newsletterSubmitting}
                  required
                />
                <button
                  type="submit"
                  className="footer__newsletter-button"
                  disabled={newsletterSubmitting}
                >
                  {newsletterSubmitting ? t('footer.saving', 'Saving...') : t('footer.subscribe', 'Subscribe')}
                </button>
              </form>
              {newsletterStatus && (
                <p
                  className={`footer__newsletter-status footer__newsletter-status--${newsletterStatus}`}
                  role="status"
                  aria-live="polite"
                >
                  {newsletterMessage}
                </p>
              )}
            </div>
          </section>

          <section className="footer__visit-column">
            <h4>{t('footer.visitUs', 'Visit Us')}</h4>
            <div className="footer__map-shell">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3967.1234567890123!2d7.0147!3d4.7731!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x107f3e5a5a5a5a5d%3A0x5a5a5a5a5a5a5a5!2s36%20Shell%20Location%20Rd%2C%20Mgbuoba%2C%20Port%20Harcourt!5e0!3m2!1sen!2sng!4v1234567890"
                width="100%"
                height="250"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="FGC Upper Room map location"
              ></iframe>
            </div>
            <div className="footer__address-wrap">
              <i className="fa-solid fa-location-dot" aria-hidden="true"></i>
              <div>
                <p className="footer__address-title">{t('footer.addressTitle', 'Foursquare Gospel Church, Mgbuoba Zonal HQ')}</p>
                <p className="footer__address-line">{t('footer.addressLine1', '36 Shell Location Road, Mgbuoba')}</p>
                <p className="footer__address-line">{t('footer.addressLine2', 'Port Harcourt, Rivers State, Nigeria')}</p>
              </div>
            </div>

            <div className="footer__language-switcher" ref={languageMenuRef}>
              <p className="footer__language-label">{t('footer.languageLabel', 'Language')}</p>
              <button
                ref={languageTriggerRef}
                type="button"
                className={`footer__language-trigger ${isLanguageMenuOpen ? 'footer__language-trigger--open' : ''}`}
                aria-haspopup="listbox"
                aria-expanded={isLanguageMenuOpen}
                aria-label={t('footer.languageLabel', 'Language')}
                onClick={() => setIsLanguageMenuOpen((prev) => !prev)}
              >
                <span className="footer__language-trigger-value">{activeLanguage?.label || 'English'}</span>
                <span className="footer__language-trigger-code">{String(activeLanguage?.code || 'en').toUpperCase()}</span>
                <i className="fa-solid fa-chevron-down" aria-hidden="true"></i>
              </button>

              {isLanguageMenuOpen ? (
                <ul className="footer__language-menu" role="listbox" aria-label={t('footer.languageLabel', 'Language')}>
                  {languages.map((item) => (
                    <li key={item.code}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={language === item.code}
                        className={`footer__language-option ${language === item.code ? 'footer__language-option--active' : ''}`}
                        onClick={() => handleLanguageSelect(item.code)}
                      >
                        <span>{item.label}</span>
                        <small>{item.code.toUpperCase()}</small>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </section>
        </div>

        <div className="footer__bottom">
          <p className="footer__scripture">
            {t('footer.scripture', '"Jesus Christ the same yesterday, and today, and forever."')} — Hebrews 13:8
          </p>
          <p className="footer__copyright">
            © {new Date().getFullYear()} FGC Upper Room Mgbuoba. {t('footer.rightsReserved', 'All rights reserved.')}{' '}
            <Link to="/privacy" className="footer__privacy-link">{t('footer.privacyPolicy', 'Privacy Policy')}</Link>
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
