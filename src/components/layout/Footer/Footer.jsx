import { Link } from 'react-router-dom'
import { FacebookIcon, InstagramIcon, YoutubeIcon, TwitterIcon } from '../../common/SocialIcons'
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
    'Sunday: 7:30 AM & 9:30 AM',
    'Wednesday: 5:30 PM',
    'Friday (Upper Room): 5:00 PM',
  ]

  const socialLinks = [
    { Icon: FacebookIcon, label: 'Facebook', url: '#' },
    { Icon: InstagramIcon, label: 'Instagram', url: '#' },
    { Icon: YoutubeIcon, label: 'YouTube', url: '#' },
    { Icon: TwitterIcon, label: 'Twitter', url: '#' },
  ]

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div className="footer__about">
            <div className="footer__logo">
              <img src="./assets/logos/logo-white.png" alt="Foursquare Logo" />
              <div>
                <h3>Upper Room Mgbuoba</h3>
                <span>Raising Kingdom Youth</span>
              </div>
            </div>
            <p>
              A vibrant youth fellowship under Foursquare Gospel Church, 
              Mgbuoba Zonal HQ. Raising young people who know God and make Him known.
            </p>
            <p className="footer__address">
              36 Shell Location Road, Mgbuoba<br />
              Port Harcourt, Rivers State, Nigeria
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
