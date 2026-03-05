import { Link } from 'react-router-dom'
import { Button, SectionHeader, Card } from '../../components/common'
import { FacebookIcon, InstagramIcon, YoutubeIcon, TwitterIcon } from '../../components/common/SocialIcons'
import { ServiceBar } from '../../components/layout'
import { Countdown, FoursquareIcons, Testimonials } from '../../components/features'
import './Home.css'

// Hero Section
const Hero = () => (
  <section className="hero">
    <div className="hero__overlay" />
    <div className="hero__content">
      <img 
        src="./assets/logos/logo-white.png" 
        alt="Foursquare Logo" 
        className="hero__logo"
      />
      <p className="hero__welcome">Welcome to</p>
      <h1 className="hero__title">Upper Room Mgbuoba</h1>
      <p className="hero__tagline">Raising Kingdom Youth</p>
      
      <Countdown variant="hero" />
      
      <div className="hero__actions">
        <Button href="#new-here" variant="white" size="lg">Join Us</Button>
        <Button href="/about" variant="outline-light" size="lg">Learn More</Button>
      </div>
    </div>
    <div className="hero__scroll">
      <span>Scroll</span>
      <div className="hero__scroll-line" />
    </div>
  </section>
)

// Pastor Welcome Section
const PastorWelcome = () => (
  <section className="pastor-welcome">
    <div className="container">
      <div className="pastor-welcome__grid">
        <div className="pastor-welcome__image">
          <div className="pastor-welcome__placeholder">
            <span>Pastor Photo</span>
          </div>
        </div>
        <div className="pastor-welcome__content">
          <span className="pastor-welcome__tag">From Our Pastor</span>
          <h2>Welcome to Our Family</h2>
          <p>
            On behalf of the entire Foursquare Gospel Church, Mgbuoba Zonal Headquarters, 
            I warmly welcome you to our youth fellowship - Upper Room. We believe that God 
            has a special plan for every young person, and we are committed to helping you 
            discover and fulfill that purpose.
          </p>
          <p>
            Whether you're seeking spiritual growth, meaningful relationships, or a place 
            to belong, you'll find it here. Come as you are, and let's grow together in 
            the knowledge and grace of our Lord Jesus Christ.
          </p>
          <div className="pastor-welcome__signature">
            <strong>Rev. Dr. Martins Okoro</strong>
            <span>Senior Pastor, FGC Mgbuoba Zonal HQ</span>
          </div>
        </div>
      </div>
    </div>
  </section>
)

// What We Believe Section
const WhatWeBelieve = () => {
  const beliefs = [
    {
      title: 'Jesus the Savior',
      description: 'Salvation through faith in Jesus Christ, who died for our sins and rose for our justification.',
      color: 'red',
      icon: '/fgc-testing/assets/icons/icon-cross.png'
    },
    {
      title: 'Jesus the Baptizer',
      description: 'Baptism of the Holy Spirit with evidence of speaking in tongues, empowering believers.',
      color: 'yellow',
      icon: '/fgc-testing/assets/icons/icon-dove.png'
    },
    {
      title: 'Jesus the Healer',
      description: 'Divine healing through faith in Jesus Christ, who bore our sicknesses and diseases.',
      color: 'blue',
      icon: '/fgc-testing/assets/icons/icon-cup.png'
    },
    {
      title: 'Jesus the Coming Soon King',
      description: 'The imminent, personal return of our Lord Jesus Christ to establish His kingdom.',
      color: 'purple',
      icon: '/fgc-testing/assets/icons/icon-crown.png'
    }
  ]

  return (
    <section className="beliefs">
      <div className="container">
        <SectionHeader
          tag="What We Believe"
          title="The Foursquare Gospel"
          subtitle="Jesus Christ the same yesterday, and today, and forever. — Hebrews 13:8"
          light
        />
        <div className="beliefs__grid">
          {beliefs.map((belief, index) => (
            <div key={index} className={`beliefs__card beliefs__card--${belief.color}`}>
              <div className="beliefs__card-header">
                  <img src={belief.icon} alt="" className="beliefs__icon" />
                <h3>{belief.title}</h3>
              </div>
              <p>{belief.description}</p>
            </div>
          ))}
        </div>
        <div className="beliefs__cta">
          <Button href="/about" variant="white">Learn More About Us</Button>
        </div>
      </div>
    </section>
  )
}

// New Here Section
const NewHere = () => (
  <section id="new-here" className="new-here">
    <div className="container">
      <div className="new-here__content">
        <SectionHeader
          tag="First Time?"
          title="New Here? Welcome!"
          subtitle="We're so glad you found us. Here's what to expect when you visit."
        />
        <div className="new-here__grid">
          <div className="new-here__card">
            <div className="new-here__icon">
              <i className="fa-solid fa-handshake fa-beat"></i>
            </div>
            <h3>Warm Welcome</h3>
            <p>Our greeters will help you find your way and answer any questions you have.</p>
          </div>
          <div className="new-here__card">
            <div className="new-here__icon">
              <i className="fa-solid fa-music fa-beat"></i>
            </div>
            <h3>Vibrant Worship</h3>
            <p>Experience heartfelt worship that draws you closer to God's presence.</p>
          </div>
          <div className="new-here__card">
            <div className="new-here__icon">
              <i className="fa-solid fa-book-bible fa-beat"></i>
            </div>
            <h3>Relevant Teaching</h3>
            <p>Biblical messages that apply to your everyday life and spiritual growth.</p>
          </div>
          <div className="new-here__card">
            <div className="new-here__icon">
              <i className="fa-solid fa-people-group fa-beat"></i>
            </div>
            <h3>Real Community</h3>
            <p>Connect with other young people who share your faith journey.</p>
          </div>
        </div>
        <div className="new-here__actions">
          <Button href="/contact" variant="primary" size="lg">Plan Your Visit</Button>
          <Button href="/contact" variant="outline" size="lg">Contact Us</Button>
        </div>
      </div>
    </div>
  </section>
)

// Social Media Section
const SocialMedia = () => {
  const socials = [
    { Icon: FacebookIcon, name: 'Facebook', desc: 'Like our page for updates', url: '#' },
    { Icon: InstagramIcon, name: 'Instagram', desc: 'Follow our journey', url: '#' },
    { Icon: YoutubeIcon, name: 'YouTube', desc: 'Watch our videos', url: '#' },
    { Icon: TwitterIcon, name: 'Twitter', desc: 'Join the conversation', url: '#' },
  ]

  return (
    <section className="social-section">
      <div className="container">
        <SectionHeader
          tag="Stay Connected"
          title="Follow Us Online"
          subtitle="Join our online community and stay updated with the latest from Upper Room."
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
}

// Main Home Page
const Home = () => {
  return (
    <>
      <Hero />
      <ServiceBar />
      <PastorWelcome />
      <WhatWeBelieve />
      <NewHere />
      <FoursquareIcons />
      <Testimonials />
      <SocialMedia />
    </>
  )
}

export default Home
