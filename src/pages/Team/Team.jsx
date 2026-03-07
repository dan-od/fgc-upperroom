import { SectionHeader } from '../../components/common'
import './Team.css'

const Team = () => {
  const leadership = [
    {
      name: 'Bro. Babatunde Alepaye',
      role: 'Youth Pastor',
      description: 'Upperroom Mgbuoba',
      image: null
    },
    {
      name: 'Rev. Dr. Martins Okoro',
      role: 'Senior Pastor',
      description: 'FGC Mgbuoba Zonal HQ',
      image: null
    },
    
    {
      name: 'Dr. Austen Sado',
      role: 'Youth Advisor',
      description: 'Upperroom Mgbuoba',
      image: null
    }
  ]

  const excos = [
    { name: 'Sis. Rejoice Lazarus', role: 'Vice President', image: null },
    { name: 'Bro. Gibson Ekikere', role: 'President', image: null },
    { name: 'Bro. Thompson Ogemdi', role: 'Secretary', image: null },
  ]

  const departments = [
    { name: 'Choir', icon: 'fa-solid fa-music', description: 'Leading worship through music' },
    { name: 'Media', icon: 'fa-solid fa-camera', description: 'Capturing and sharing our moments' },
    { name: 'Ushers', icon: 'fa-solid fa-handshake', description: 'Welcoming and assisting members' },
    { name: 'Drama', icon: 'fa-solid fa-masks-theater', description: 'Creative arts ministry' },
    { name: 'Sanctuary', icon: 'fa-solid fa-church', description: 'Maintaining God\'s house' },
    { name: 'Protocol', icon: 'fa-solid fa-clipboard-list', description: 'Organizing and coordinating' },
    { name: 'Prayer', icon: 'fa-solid fa-hands-praying', description: 'Interceding for the fellowship' },
    { name: 'Greeters', icon: 'fa-solid fa-people-group', description: 'Creating a warm and welcoming environment' },
    { name: 'Welfare', icon: 'fa-solid fa-hand-holding-heart', description: 'Caring for the wellbeing of members' },
  ]

  return (
    <main className="team-page">
      {/* Banner */}
      <section className="page-banner bg-purple">
        <div className="container">
          <h1>Our Team</h1>
          <p>Meet the people who make the Upperroom happen</p>
        </div>
      </section>

      {/* Leadership */}
      <section className="team-section">
        <div className="container">
          <SectionHeader
            tag="Leadership"
            title="Our Shepherds"
            subtitle="Spiritual leaders guiding our fellowship"
          />
          <div className="team-grid team-grid--3">
            {leadership.map((person, index) => (
              <div key={index} className="team-card team-card--leadership">
                <div className="team-card__image">
                  <div className="team-card__placeholder">{person.name.charAt(0)}</div>
                </div>
                <h3>{person.name}</h3>
                <p className="team-card__role">{person.role}</p>
                <p className="team-card__desc">{person.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Excos */}
      <section className="team-section bg-cream">
        <div className="container">
          <SectionHeader
            tag="Executive"
            title="Our Excos"
            subtitle="Youth executives leading the fellowship"
          />
          <div className="team-grid team-grid--3">
            {excos.map((person, index) => (
              <div key={index} className="team-card">
                <div className="team-card__image">
                  <div className="team-card__placeholder">{person.name.charAt(0)}</div>
                </div>
                <h3>{person.name}</h3>
                <p className="team-card__role">{person.role}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Departments */}
      <section className="team-section">
        <div className="container">
          <SectionHeader
            tag="Departments"
            title="Our Units"
            subtitle="Various departments serving in the fellowship"
          />
          <div className="dept-grid">
            {departments.map((dept, index) => (
              <div key={index} className="dept-card">
                <span className="dept-card__icon">
                  <i className={dept.icon}></i>
                </span>
                <h3>{dept.name}</h3>
                <p>{dept.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  )
}

export default Team
