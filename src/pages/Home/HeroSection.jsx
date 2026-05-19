import { useState, useRef, useEffect } from 'react'
import { Button } from '../../components/common'
import { Countdown, GivingModal } from '../../components/features'
import { trackRumEvent } from '../../utils/rum'
import { toAssetUrl } from '../../utils/appPaths'
import { useI18n } from '../../i18n/LanguageContext'
import useSundayMode from './useSundayMode'

const CHURCH_ADDRESS = '36 Shell Location Road, Mgbuoba, Port Harcourt, Rivers State, Nigeria'
const HERO_ICONS = {
  cross: toAssetUrl('assets/icons/icon-cross.png'),
  dove: toAssetUrl('assets/icons/icon-dove.png'),
  cup: toAssetUrl('assets/icons/icon-cup.png'),
  crown: toAssetUrl('assets/icons/icon-crown.png')
}
const HERO_WORDMARK = toAssetUrl('assets/logos/upper_white.png')

const HeroSection = () => {
  const { t } = useI18n()
  const { isSunday } = useSundayMode()
  const [showAddress, setShowAddress] = useState(false)
  const [showGiving, setShowGiving] = useState(false)
  const [givingFund, setGivingFund] = useState('general')
  const addressModalRef = useRef(null)
  const addressCloseRef = useRef(null)

  // Focus trap for address modal
  useEffect(() => {
    if (!showAddress) {
      document.body.classList.remove('modal-open')
      return
    }
    document.body.classList.add('modal-open')
    const focusTimer = window.setTimeout(() => {
      addressCloseRef.current?.focus()
    }, 40)
    const handleKeydown = (e) => {
      if (e.key === 'Escape') { setShowAddress(false); return }
      if (e.key !== 'Tab') return
      const panel = addressModalRef.current
      if (!panel) return
      const focusable = panel.querySelectorAll('button, [href], [tabindex]:not([tabindex="-1"])')
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', handleKeydown)
    return () => {
      window.clearTimeout(focusTimer)
      document.body.classList.remove('modal-open')
      document.removeEventListener('keydown', handleKeydown)
    }
  }, [showAddress])

  const openGivingModal = (fund = 'general') => {
    setGivingFund(fund)
    setShowGiving(true)
  }

  return (
    <section className={`hero${isSunday ? ' hero--sunday' : ''}`}>
      <div className="hero__overlay" />
      <div className="hero__content">
        <div className="hero__logo hero__logo-icons" aria-label="Foursquare Gospel Symbols">
          <img src={HERO_ICONS.cross} alt="Jesus the Savior symbol" className="hero__logo-icon" />
          <img src={HERO_ICONS.dove} alt="Jesus the Baptizer symbol" className="hero__logo-icon" />
          <img src={HERO_ICONS.cup} alt="Jesus the Healer symbol" className="hero__logo-icon" />
          <img src={HERO_ICONS.crown} alt="Jesus the Coming King symbol" className="hero__logo-icon" />
        </div>
        <p className="hero__welcome">
          {t('home.heroWelcome', 'Welcome to')}<br />The
        </p>
        <img src={HERO_WORDMARK} alt="Upperroom Mgbuoba" className="hero__title" />
        <p className="hero__tagline">{t('home.heroTagline', 'Raising Kingdom Youths!')}</p>

        <Countdown variant="hero" />

        <div className={`hero__actions${isSunday ? ' hero__actions--sunday' : ''}`}>
          {isSunday ? (
            <Button
              variant="outline-light"
              size="lg"
              className="hero__action-btn hero__action-btn--live hero__action-btn--sunday"
              onClick={() => setShowAddress(true)}
            >
              <i className="fa-solid fa-lock" aria-hidden="true" style={{ fontSize: '0.85em' }} />
              {t('home.heroLiveCta', 'Join Live')}
            </Button>
          ) : (
            <Button href="#new-here" variant="white" size="lg" className="hero__action-btn">
              {t('home.joinUs', 'Join Us')}
            </Button>
          )}

          {isSunday ? (
            <Button
              variant="outline-light"
              size="lg"
              className="hero__action-btn hero__action-btn--sunday"
              onClick={() => {
                trackRumEvent({ metric: 'SUNDAY_OFFERING_CTA_CLICK', value: 1, source: 'hero-sunday-cta' })
                openGivingModal('sunday-offering')
              }}
            >
              Sunday Offering
            </Button>
          ) : (
            <Button
              variant="outline-light"
              size="lg"
              className="hero__action-btn"
              onClick={() => openGivingModal('general')}
            >
              Give
            </Button>
          )}
        </div>
      </div>

      <div className="hero__scroll">
        <span>{t('home.scroll', 'Scroll')}</span>
        <div className="hero__scroll-line" />
      </div>

      {showAddress && (
        <div
          className="hero-live-modal-overlay"
          onClick={() => setShowAddress(false)}
        >
          <div
            ref={addressModalRef}
            className="hero-live-modal hero-address-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="hero-address-modal-title"
          >
            <button
              ref={addressCloseRef}
              type="button"
              className="hero-live-modal__close"
              aria-label={t('home.closeAddressModal', 'Close')}
              onClick={() => setShowAddress(false)}
            >
              <i className="fa-solid fa-xmark" aria-hidden="true" />
            </button>
            <div className="hero-address-modal__icon">
              <i className="fa-solid fa-location-dot" aria-hidden="true" />
            </div>
            <h2 id="hero-address-modal-title">{t('home.addressModalTitle', 'We Are Live!')}</h2>
            <p className="hero-live-modal__subtitle">
              {t(
                'home.addressModalBody',
                'We are holding our Sunday service in person right now. Please visit us at:'
              )}
            </p>
            <address className="hero-address-modal__address">
              {CHURCH_ADDRESS}
            </address>
            <div className="hero-live-modal__actions">
              <Button
                href={`https://maps.google.com/?q=${encodeURIComponent(CHURCH_ADDRESS)}`}
                external
                target="_blank"
                rel="noopener noreferrer"
                variant="outline-light"
                size="md"
              >
                <i className="fa-solid fa-map" aria-hidden="true" style={{ marginRight: '0.4em' }} />
                {t('home.addressModalDirections', 'Get Directions')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <GivingModal
        isOpen={showGiving}
        onClose={() => setShowGiving(false)}
        defaultFund={givingFund}
        ctaRef={isSunday ? 'hero-sunday-cta' : 'hero-give-cta'}
      />
    </section>
  )
}

export default HeroSection
