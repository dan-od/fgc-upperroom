import { Link } from 'react-router-dom'
import { FacebookIcon, InstagramIcon, YoutubeIcon, TwitterIcon, TikTokIcon } from '../../common/SocialIcons'
import './Footer.css'

const Footer = () => {
  const quickLinks = [
    { path: '/', label: 'Home' },
    { path: '/about', label: 'About' },
    { path: '/team', label: 'Our Team' },
    { path: '/events', label: 'Events' },
    { path: '/contact', label: 'Contact' },
  ]

  const resources = [
    { path: '/media', label: 'Media' },
    { path: '/testimonies', label: 'Testimonies' },
    { path: '/blog', label: 'Blog' },
    { path: '/contact', label: 'Prayer Request' },
  ]

  const serviceTimes = [
    '1st Sunday: Worship Service — 7:30 AM',
    'Other Sundays: Youth Service — 8:00 AM',
    'Wednesday: 5:00 PM (Coming Soon)',
  ]

  const socialLinks = [
    { Icon: FacebookIcon, label: 'Facebook', url: 'https://web.facebook.com/profile.php?id=61587147628624' },
    { Icon: InstagramIcon, label: 'Instagram', url: 'https://www.instagram.com/theupperroom_4sq/' },
    { Icon: YoutubeIcon, label: 'YouTube', url: 'https://youtube.com/@theupperroom_4sq?si=mDSHkd21JpLiDmwC' },
    { Icon: TikTokIcon, label: 'TikTok', url: 'https://tiktok.com/@theupperroom_4sq' },
    { Icon: TwitterIcon, label: 'X', url: 'https://x.com/Upperroom_4sq' },
  ]

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__grid-left">
            <div className="footer__about">
              <div className="footer__logo">
                <img src="./assets/logos/logo-white.png" alt="Foursquare Logo" className="footer__brand-mark" />
                <span className="footer__brand-divider" aria-hidden="true"></span>
                <div className="footer__brand-text">
                  <picture>
                    <source media="(min-width: 769px)" srcSet="./assets/logos/upper_left_align_white.png" />
                    <img src="./assets/logos/upper_white.png" alt="Upperroom Mgbuoba" className="footer__brand-wordmark" />
                  </picture>
                  <span>Raising Kingdom Youths!</span>
                </div>
              </div>
              <p>
                A vibrant youth fellowship under the Foursquare Gospel Church, 
                Mgbuoba Zonal HQ. Raising young people who know God and make Him known.
              </p>
            </div>

            <div className="footer__section">
              <h4>Quick Links</h4>
              <ul>
                {quickLinks.map((link) => (
                  <li key={link.path}>
                    <Link to={link.path}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="footer__section">
              <h4>Resources</h4>
              <ul>
                {resources.map((link) => (
                  <li key={link.label}>
                    <Link to={link.path}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </div>

            <div className="footer__section">
              <h4>Service Times</h4>
              <ul>
                {serviceTimes.map((time, index) => (
                  <li key={index} className="footer__time">{time}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="footer__map">
            <h4>Visit Us</h4>
            <iframe
              src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3967.1234567890123!2d7.0147!3d4.7731!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x107f3e5a5a5a5a5d%3A0x5a5a5a5a5a5a5a5!2s36%20Shell%20Location%20Rd%2C%20Mgbuoba%2C%20Port%20Harcourt!5e0!3m2!1sen!2sng!4v1234567890"
              width="100%"
              height="300"
              style={{ border: 0, borderRadius: 'var(--radius-md)' }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
            <p className="footer__address">
              36 Shell Location Road, Mgbuoba<br />
              Port Harcourt, Rivers State, Nigeria
            </p>
          </div>
        </div>

        <div className="footer__bottom">
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
          
          <p className="footer__copyright">
            © {new Date().getFullYear()} FGC Upper Room Mgbuoba. All rights reserved.
          </p>
          
          <p className="footer__scripture">
            "Jesus Christ the same yesterday, and today, and forever." — Hebrews 13:8
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
