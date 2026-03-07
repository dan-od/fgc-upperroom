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
              <h2>The Upperroom</h2>
              <p>
                We are the youth fellowship of the Foursquare Gospel Church, 
                Mgbuoba Zonal Headquarters.<br />We are a vibrant community of young 
                believers passionate about knowing God and making Him known.
              </p>
              <p>
                Our name "Upperroom" is inspired by Acts 1:13-14, where the early 
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

      {/* Anthems */}
      <section className="anthems-section">
        <div className="container">
          <SectionHeader
            tag="Our Anthems"
            title="Songs of Faith"
            subtitle="The hymns that define our heritage and mission"
          />
          <div className="anthems-grid">
            <div className="anthem-card">
              <h3>Foursquare Anthem</h3>
              <div className="anthem-lyrics">
                <p>Foursquare we stand for the living word<br />
                  For the word of God<br />
                  Telling to all the story of Jesus, stem of Jesse's rod<br />
                  Man of sorrow and of grief, dying on the tree<br />
                  Mighty Redeemer, glorious Saviour<br />
                  Jesus of Calvary
                </p>

                <p className="chorus"><strong>Chorus</strong>
                  Preach the Foursquare Gospel<br />
                  The Foursquare Gospel<br />
                  Clear let the Foursquare message ring<br />
                  (Let it ring)<br />
                  Jesus only Saviour, Baptizer and Healer<br />
                  Jesus the coming King
                </p>

                <p>Unfurl your banners and forward go<br />
                  Oh ye ransomed host<br />
                  Trusting in Jesus Mighty Baptizer<br />
                  With the Holy Ghost<br />
                  Lion of Judah, King of kings, Lord of lords is He<br />
                  Clothing His church with power to witness<br />
                  Leading to victory.
                </p>

                <p>Catch up your shield oh ye living Church<br />
                  Christ of Galilee<br />
                  Bore all our sickness, carried our sorrows<br />
                  Set the prisoners free<br />
                  Lift the fallen, help the faith, dry the weeping eyes<br />
                  Come bring your sickness<br />
                  To thy physician, for He is passing by.
                </p>

                <p>Lift your eyes, then unto the hills<br />
                  Lift your voice and sing<br />
                  The cloud of heavens aflame with glory<br />
                  Greet the coming King<br />
                  Swift as wings of eagle's flight<br />
                  Shall He come again,<br />
                  Clad in His glory, and robed in Honor<br />
                  And with His Saints shall reign.
                </p>
              </div>
            </div>
            <div className="anthem-card">
              <h3>Upper Room Anthem</h3>
              <div className="anthem-lyrics">
                <p>
                  We are youthful people,<br />
                  With purpose for our lives,<br />
                  You can know us by our values,<br />
                  Our value's in our DRIVE<br />
                  Diligence, respect, integrity, VITALITY...<br />
                  For the spirit of excellence is in us.
                </p>
              </div>
            </div>
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
