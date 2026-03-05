import { FacebookIcon, InstagramIcon, YoutubeIcon } from '../../common/SocialIcons'
import './ServiceBar.css'

const ServiceBar = () => {
  const socialLinks = [
    { Icon: FacebookIcon, url: '#', label: 'Facebook' },
    { Icon: InstagramIcon, url: '#', label: 'Instagram' },
    { Icon: YoutubeIcon, url: '#', label: 'YouTube' },
  ]

  return (
    <div className="service-bar">
      <div className="service-bar__container">
        <p className="service-bar__times">
          Join us on Sundays at 7:30am and 9:30am | Wednesdays at 5:30pm | Fridays at 5:00pm
        </p>
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
