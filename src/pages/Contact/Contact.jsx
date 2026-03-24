import { useState } from 'react'
import { Button } from '../../components/common'
import { FacebookIcon, InstagramIcon, YoutubeIcon, TwitterIcon, TikTokIcon } from '../../components/common/SocialIcons'
import { submitContactForm } from '../../utils/contactApi'
import './Contact.css'

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    subject: '',
    message: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [status, setStatus] = useState(null)
  const [statusMessage, setStatusMessage] = useState('')

  const validateForm = () => {
    const name = formData.name.trim()
    const email = formData.email.trim()
    const subject = formData.subject.trim()
    const message = formData.message.trim()

    if (!name || !email || !subject || !message) {
      return 'Please complete all required fields.'
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailPattern.test(email)) {
      return 'Enter a valid email address.'
    }

    if (message.length < 15) {
      return 'Your message should be at least 15 characters long.'
    }

    return null
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setStatus(null)

    const validationError = validateForm()
    if (validationError) {
      setStatus('error')
      setStatusMessage(validationError)
      return
    }

    setIsSubmitting(true)

    try {
      const payload = await submitContactForm({
        name: formData.name.trim(),
        email: formData.email.trim(),
        subject: formData.subject.trim(),
        phoneNumber: formData.phoneNumber.trim(),
        message: formData.message.trim()
      })

      setStatus('success')
      setStatusMessage(payload?.message || 'Thank you for your message. We will get back to you soon.')
      setFormData({
        name: '',
        email: '',
        phoneNumber: '',
        subject: '',
        message: ''
      })
    } catch {
      setStatus('error')
      setStatusMessage('We could not send your message right now. Please try again shortly.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const contactInfo = [
    {
      icon: 'fa-solid fa-location-dot',
      title: 'Address',
      content: '36 Shell Location Road, Mgbuoba\nPort Harcourt, Rivers State, Nigeria'
    },
    {
      icon: 'fa-solid fa-phone',
      title: 'Phone',
      content: '+234 703 152 6399'
    },
    {
      icon: 'fa-solid fa-envelope',
      title: 'Email',
      content: 'upperroom@fgcmgbuoba.org'
    },
    {
      icon: 'fa-brands fa-whatsapp',
      title: 'WhatsApp',
      content: '+234 703 152 6399'
    },
    {
      icon: 'fa-solid fa-clock',
      title: 'Service Times',
      content: '1st Sunday: Communion Service — 7:30 AM\nOther Sundays: Youth Service — 8:00 AM\nWednesday: 5:00 PM (Coming Soon)'
    }
  ]

  return (
    <main id="main-content" className="contact-page">
      {/* Banner */}
      <section className="page-banner bg-red">
        <div className="container">
          <h1>Contact Us</h1>
          <p>We'd love to hear from you</p>
        </div>
      </section>

      {/* Contact Section */}
      <section className="contact-section">
        <div className="container">
          <div className="contact-grid">
            {/* Contact Info */}
            <div className="contact-info">
              <h2>Get In Touch</h2>
              <p>
                Have questions? Want to plan a visit? Or just want to say hello? 
                We're here for you. Reach out through any of the channels below.
              </p>
              
              <div className="contact-info__list">
                {contactInfo.map((item, index) => (
                  <div key={index} className="contact-info__item">
                    <span className="contact-info__icon">
                      <i className={item.icon}></i>
                    </span>
                    <div>
                      <h4>{item.title}</h4>
                      <p>{item.content}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="contact-socials">
                <div className="contact-socials__follow">
                  <h4>Follow Us</h4>
                  <div className="contact-socials__links">
                    <a href="https://web.facebook.com/profile.php?id=61587147628624" className="social-link" title="Facebook" aria-label="Follow us on Facebook" target="_blank" rel="noopener noreferrer"><FacebookIcon size={18} /></a>
                    <a href="https://www.instagram.com/theupperroom_4sq/" className="social-link" title="Instagram" aria-label="Follow us on Instagram" target="_blank" rel="noopener noreferrer"><InstagramIcon size={18} /></a>
                    <a href="https://youtube.com/@theupperroom_4sq?si=mDSHkd21JpLiDmwC" className="social-link" title="YouTube" aria-label="Watch us on YouTube" target="_blank" rel="noopener noreferrer"><YoutubeIcon size={18} /></a>
                    <a href="https://x.com/Upperroom_4sq" className="social-link" title="X" aria-label="Follow us on X" target="_blank" rel="noopener noreferrer"><TwitterIcon size={18} /></a>
                    <a href="https://tiktok.com/@theupperroom_4sq" className="social-link" title="TikTok" aria-label="Follow us on TikTok" target="_blank" rel="noopener noreferrer"><TikTokIcon size={18} /></a>
                  </div>
                </div>
                <div className="contact-socials__speak">
                  <h4>Speak With Us</h4>
                  <div className="contact-socials__speak-links">
                    <a href="https://wa.me/2347031526399" className="speak-link" title="WhatsApp Chat" aria-label="Chat with us on WhatsApp" target="_blank" rel="noopener noreferrer"><i className="fa-brands fa-whatsapp"></i></a>
                    <a href="tel:+2347031526399" className="speak-link" title="Phone Call" aria-label="Call us by phone"><i className="fa-solid fa-phone"></i></a>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="contact-form-wrapper">
              <h3>Send Us a Message</h3>
              <form className="contact-form" onSubmit={handleSubmit}>
                {status && (
                  <p className={`contact-form__status contact-form__status--${status}`}>
                    {statusMessage}
                  </p>
                )}
                <div className="form-group">
                  <label htmlFor="name">Your Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    autoComplete="name"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    autoComplete="email"
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="phoneNumber">Phone Number (Optional)</label>
                  <input
                    type="tel"
                    id="phoneNumber"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    autoComplete="tel"
                    inputMode="tel"
                    disabled={isSubmitting}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="subject">Subject</label>
                  <select
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    disabled={isSubmitting}
                  >
                    <option value="">Select a subject</option>
                    <option value="general">General Inquiry</option>
                    <option value="visit">Plan a Visit</option>
                    <option value="prayer">Prayer Request</option>
                    <option value="join">Join a Department</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="form-group">
                  <label htmlFor="message">Your Message</label>
                  <textarea
                    id="message"
                    name="message"
                    rows="5"
                    value={formData.message}
                    onChange={handleChange}
                    minLength={15}
                    required
                    disabled={isSubmitting}
                  />
                </div>
                <Button type="submit" variant="primary" size="lg" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}

export default Contact
