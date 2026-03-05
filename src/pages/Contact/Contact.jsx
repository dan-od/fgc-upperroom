import { useState } from 'react'
import { SectionHeader, Button } from '../../components/common'
import { FacebookIcon, InstagramIcon, YoutubeIcon, TwitterIcon } from '../../components/common/SocialIcons'
import './Contact.css'

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    // Handle form submission
    console.log('Form submitted:', formData)
    alert('Thank you for your message! We will get back to you soon.')
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
      content: '+234 800 000 0000'
    },
    {
      icon: 'fa-solid fa-envelope',
      title: 'Email',
      content: 'upperroom@fgcmgbuoba.org'
    },
    {
      icon: 'fa-solid fa-clock',
      title: 'Service Times',
      content: 'Sunday: 7:30 AM & 9:30 AM\nWednesday: 5:30 PM\nFriday: 5:00 PM'
    }
  ]

  return (
    <main className="contact-page">
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
                <h4>Follow Us</h4>
                <div className="contact-socials__links">
                  <a href="#" className="social-link" title="Facebook"><FacebookIcon size={18} /></a>
                  <a href="#" className="social-link" title="Instagram"><InstagramIcon size={18} /></a>
                  <a href="#" className="social-link" title="YouTube"><YoutubeIcon size={18} /></a>
                  <a href="#" className="social-link" title="Twitter"><TwitterIcon size={18} /></a>
                </div>
              </div>
            </div>

            {/* Contact Form */}
            <div className="contact-form-wrapper">
              <h3>Send Us a Message</h3>
              <form className="contact-form" onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="name">Your Name</label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
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
                    required
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
                    required
                  />
                </div>
                <Button type="submit" variant="primary" size="lg">
                  Send Message
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Map */}
      <section className="map-section">
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3975.5!2d6.98!3d4.85!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNMKwNTEnMDAuMCJOIDfCsDAwJzAwLjAiRQ!5e0!3m2!1sen!2sng!4v1234567890"
          allowFullScreen=""
          loading="lazy"
          title="Church Location"
        />
      </section>
    </main>
  )
}

export default Contact
