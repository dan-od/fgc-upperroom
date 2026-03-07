import { useState, useEffect } from 'react'
import { FacebookIcon, InstagramIcon, YoutubeIcon, TikTokIcon, TwitterIcon } from '../../common/SocialIcons'
import './ServiceBar.css'

const ServiceBar = () => {
  const announcements = [
    '🕐 Join us on Sundays at 7:30am and 9:30am | Wednesdays at 5:30pm | Fridays at 5:00pm',
    '📱 Follow us on social media for daily inspirations and event updates',
    '🙏 Become a member of the prayer team and intercede for the fellowship',
    '🎵 Join our choir ministry and help lead worship with music',
    '❤️ Support our welfare unit by reaching out to those in need',
  ]

  const [currentIndex, setCurrentIndex] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % announcements.length)
    }, 10000)
    return () => clearInterval(interval)
  }, [announcements.length])

  const socialLinks = [
    { Icon: FacebookIcon, url: 'https://web.facebook.com/profile.php?id=61587147628624', label: 'Facebook' },
    { Icon: InstagramIcon, url: 'https://www.instagram.com/theupperroom_4sq/', label: 'Instagram' },
    { Icon: YoutubeIcon, url: 'https://youtube.com/@theupperroom_4sq?si=mDSHkd21JpLiDmwC', label: 'YouTube' },
    { Icon: TikTokIcon, url: 'https://tiktok.com/@theupperroom_4sq', label: 'TikTok' },
    { Icon: TwitterIcon, url: 'https://x.com/Upperroom_4sq', label: 'X' },
  ]

  return (
    <div className="service-bar">
      <div className="service-bar__container">
        <div className="service-bar__alert-wrapper">
          {announcements.map((announcement, index) => (
            <p
              key={index}
              className={`service-bar__alert ${index === currentIndex ? 'service-bar__alert--active' : ''}`}
            >
              {announcement}
            </p>
          ))}
        </div>
        <div className="service-bar__socials">
          {socialLinks.map((social) => (
            <a
              key={social.label}
              href={social.url}
              className="service-bar__social"
              title={social.label}
              target="_blank"
              rel="noopener noreferrer"
            >
              <social.Icon size={16} />
            </a>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ServiceBar
