import { Button, SectionHeader } from '../../components/common'

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

export default NewHere
