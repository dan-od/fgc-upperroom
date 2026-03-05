import { SectionHeader, Button } from '../../components/common'
import './About.css'

const About = () => {
  const beliefs = [
    {
      title: 'Jesus the Savior',
      description: 'We believe that Jesus Christ is the Son of God, who died on the cross for our sins and rose again on the third day. Through faith in Him, we receive salvation and eternal life.',
      verse: 'John 3:16',
      color: 'red'
    },
    {
      title: 'Jesus the Baptizer',
      description: 'We believe in the baptism of the Holy Spirit with the evidence of speaking in tongues, empowering believers for service and witnessing.',
      verse: 'Acts 2:4',
      color: 'yellow'
    },
    {
      title: 'Jesus the Healer',
      description: 'We believe that divine healing is provided for all in the atonement. Jesus bore our sicknesses and by His stripes we are healed.',
      verse: 'Isaiah 53:5',
      color: 'blue'
    },
    {
      title: 'Jesus the Coming King',
      description: 'We believe in the imminent, personal return of our Lord Jesus Christ to rapture His church and establish His kingdom on earth.',
      verse: '1 Thess. 4:16-17',
      color: 'purple'
    }
  ]

  return (
    <main className="about-page">
      {/* Hero Banner */}
      <section className="page-banner bg-blue">
        <div className="container">
          <h1>About Us</h1>
          <p>Discover who we are and what we believe</p>
        </div>
      </section>

      {/* Who We Are */}
      <section className="about-intro">
        <div className="container">
          <div className="about-intro__grid">
            <div className="about-intro__content">
              <span className="tag">Who We Are</span>
              <h2>Upper Room Mgbuoba</h2>
              <p>
                Upper Room is the youth fellowship of Foursquare Gospel Church, 
                Mgbuoba Zonal Headquarters. We are a vibrant community of young 
                believers passionate about knowing God and making Him known.
              </p>
              <p>
                Our name "Upper Room" is inspired by Acts 1:13-14, where the early 
                disciples gathered in prayer and unity, waiting for the promise of 
                the Holy Spirit. Like them, we gather to seek God's presence, grow 
                in faith, and be empowered for kingdom impact.
              </p>
              <p>
                Under the covering of our parent church led by Rev. Dr. Martins Okoro, 
                we are committed to raising a generation of young people who will 
                stand for Christ in their schools, workplaces, and communities.
              </p>
            </div>
            <div className="about-intro__image">
              <div className="placeholder">Youth Photo</div>
            </div>
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="vision-mission bg-cream">
        <div className="container">
          <div className="vision-mission__grid">
            <div className="vision-mission__card">
              <h3>Our Vision</h3>
              <p>
                To raise a generation of kingdom-minded youth who know God intimately, 
                serve Him passionately, and impact their world for Christ.
              </p>
            </div>
            <div className="vision-mission__card">
              <h3>Our Mission</h3>
              <p>
                To create a community where young people encounter God, grow in faith, 
                develop their gifts, and are equipped to fulfill their God-given purpose.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* What We Believe */}
      <section className="beliefs-full bg-blue">
        <div className="container">
          <SectionHeader
            tag="Our Foundation"
            title="The Foursquare Gospel"
            subtitle="Jesus Christ the same yesterday, and today, and forever. — Hebrews 13:8"
            light
          />
          <div className="beliefs-full__grid">
            {beliefs.map((belief, index) => (
              <div key={index} className={`beliefs-full__card beliefs-full__card--${belief.color}`}>
                <h3>{belief.title}</h3>
                <p>{belief.description}</p>
                <span className="verse">{belief.verse}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="about-cta">
        <div className="container text-center">
          <h2>Ready to Join Us?</h2>
          <p>We'd love to welcome you to our family</p>
          <div className="about-cta__buttons">
            <Button href="/contact" variant="primary" size="lg">Plan Your Visit</Button>
            <Button href="/team" variant="outline" size="lg">Meet Our Team</Button>
          </div>
        </div>
      </section>
    </main>
  )
}

export default About
