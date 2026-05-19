import { useState, useRef, useEffect } from 'react'
import { Button } from '../../components/common'
import { subscribeVisitor } from '../../utils/subscribeApi'
import { useI18n } from '../../i18n/LanguageContext'

const NewsletterModal = ({ isOpen, onClose }) => {
  const { t } = useI18n()
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' })
  const [submitting, setSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState(null) // null | 'success' | 'error'
  const [statusMessage, setStatusMessage] = useState('')
  const modalRef = useRef(null)
  const closeRef = useRef(null)

  const handleClose = () => {
    onClose()
    setSubmitStatus(null)
    setStatusMessage('')
  }

  useEffect(() => {
    if (!isOpen) {
      document.body.classList.remove('modal-open')
      return
    }

    document.body.classList.add('modal-open')

    const focusTimer = window.setTimeout(() => {
      closeRef.current?.focus()
    }, 40)

    const handleKeydown = (event) => {
      if (event.key === 'Escape') {
        handleClose()
        return
      }

      if (event.key !== 'Tab') return

      const panel = modalRef.current
      if (!panel) return

      const focusable = panel.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', handleKeydown)

    return () => {
      window.clearTimeout(focusTimer)
      document.body.classList.remove('modal-open')
      document.removeEventListener('keydown', handleKeydown)
    }
  }, [isOpen])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubscribe = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitStatus(null)

    const result = await subscribeVisitor(formData)

    setSubmitting(false)
    setStatusMessage(result.message)

    if (result.ok) {
      setSubmitStatus('success')
      setFormData({ name: '', phone: '', email: '' })
      setTimeout(() => handleClose(), 3000)
    } else {
      setSubmitStatus('error')
    }
  }

  if (!isOpen) return null

  return (
    <div className="newsletter-modal-overlay" onClick={handleClose}>
      <div
        ref={modalRef}
        className="newsletter-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="newsletter-modal-title"
      >
        <button
          ref={closeRef}
          className="newsletter-modal__close"
          onClick={handleClose}
          aria-label={t('home.closeNewsletterModal', 'Close newsletter sign-up modal')}
        >
          <i className="fa-solid fa-xmark"></i>
        </button>
        <div className="newsletter-modal__content">
          {submitStatus === 'success' ? (
            <div className="newsletter-modal__success" aria-live="polite">
              <i className="fa-solid fa-circle-check"></i>
              <h2 id="newsletter-modal-title">{t('home.newsletterSuccessTitle', "You're In!")}</h2>
              <p>{statusMessage}</p>
            </div>
          ) : (
            <>
              <h2 id="newsletter-modal-title">{t('home.newsletterTitle', 'Never Miss an Event')}</h2>
              <p>{t('home.newsletterIntro', "Get personalized WhatsApp messages about upcoming events and weekly services. Never miss out on what's happening at Upper Room!")}</p>
              {submitStatus === 'error' && (
                <p className="newsletter-modal__error" role="alert">{statusMessage}</p>
              )}
              <form className="newsletter-modal__form" onSubmit={handleSubscribe}>
                <label className="sr-only" htmlFor="home-newsletter-name">Full name</label>
                <input
                  id="home-newsletter-name"
                  type="text"
                  name="name"
                  placeholder={t('home.newsletterNamePlaceholder', 'Your Full Name')}
                  className="newsletter-modal__input"
                  value={formData.name}
                  onChange={handleInputChange}
                  autoComplete="name"
                  required
                  disabled={submitting}
                />
                <label className="sr-only" htmlFor="home-newsletter-phone">WhatsApp number</label>
                <input
                  id="home-newsletter-phone"
                  type="tel"
                  name="phone"
                  placeholder={t('home.newsletterPhonePlaceholder', 'WhatsApp Number (e.g., +234 8123456789)')}
                  className="newsletter-modal__input"
                  value={formData.phone}
                  onChange={handleInputChange}
                  inputMode="tel"
                  autoComplete="tel"
                  required
                  disabled={submitting}
                />
                <label className="sr-only" htmlFor="home-newsletter-email">Email address</label>
                <input
                  id="home-newsletter-email"
                  type="email"
                  name="email"
                  placeholder={t('home.newsletterEmailPlaceholder', 'Your Email Address')}
                  className="newsletter-modal__input"
                  value={formData.email}
                  onChange={handleInputChange}
                  autoComplete="email"
                  required
                  disabled={submitting}
                />
                <Button type="submit" variant="primary" size="lg" disabled={submitting}>
                  {submitting ? t('home.newsletterSubmitting', 'Subscribing...') : t('home.newsletterSubmit', 'Subscribe & Get Updates')}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default NewsletterModal
