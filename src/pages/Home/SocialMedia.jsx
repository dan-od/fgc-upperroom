import { SectionHeader } from '../../components/common'
import { FacebookIcon, InstagramIcon, YoutubeIcon, TwitterIcon, TikTokIcon } from '../../components/common/SocialIcons'

const socials = [
  { Icon: FacebookIcon, name: 'Facebook', desc: 'Like our page for updates', url: 'https://web.facebook.com/profile.php?id=61587147628624' },
  { Icon: InstagramIcon, name: 'Instagram', desc: 'Follow our journey', url: 'https://www.instagram.com/theupperroom_4sq/' },
  { Icon: YoutubeIcon, name: 'YouTube', desc: 'Watch our videos', url: 'https://youtube.com/@theupperroom_4sq?si=mDSHkd21JpLiDmwC' },
  { Icon: TikTokIcon, name: 'TikTok', desc: 'Watch our short videos', url: 'https://tiktok.com/@theupperroom_4sq' },
  { Icon: TwitterIcon, name: 'X', desc: 'Join the conversation', url: 'https://x.com/Upperroom_4sq' },
]

const SocialMedia = () => (
  <section className="social-section">
    <div className="container">
      <SectionHeader
        tag="Stay Connected"
        title="Follow Us Online"
        subtitle="Join our online community and stay updated with the latest from upperroom."
        light
      />
      <div className="social-section__grid">
        {socials.map((social) => (
          <a
            key={social.name}
            href={social.url}
            className="social-section__card"
            target="_blank"
            rel="noopener noreferrer"
          >
            <div className="social-section__icon">
              <social.Icon size={28} />
            </div>
            <h3>{social.name}</h3>
            <p>{social.desc}</p>
          </a>
        ))}
      </div>
    </div>
  </section>
)

export default SocialMedia
