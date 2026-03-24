import { useEffect, useRef, useState } from 'react'
import { SectionHeader } from '../../components/common'
import './Team.css'

const getInitials = (name) => {
  return String(name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('')
}

const DEFAULT_UNIT_PHONE = '+2347031526399'

const toWhatsAppDigits = (value = '') => String(value).replace(/[^\d]/g, '')

const createWhatsAppLink = (phone, text = '') => {
  const digits = toWhatsAppDigits(phone)
  if (!digits) return ''
  const payload = text.trim()
  return payload ? `https://wa.me/${digits}?text=${encodeURIComponent(payload)}` : `https://wa.me/${digits}`
}

const Team = () => {
  const baseUrl = String(import.meta.env.BASE_URL || '/')
  const withBasePath = (assetPath) => `${baseUrl}${String(assetPath || '').replace(/^\/+/, '')}`
  const leadership = [
    {
      name: 'Rev. Olayemi Ayoko',
      role: 'District & Regional Overseer',
      description: 'Foursquare Gospel Church Nigeria, South South Region',
      image: withBasePath('/assets/media/pictures/IMG_1819.png'),
      featured: true
    },
    {
      name: 'Rev. Samuel Aboyeji',
      role: 'General Overseer',
      description: 'Foursquare Gospel Church Nigeria',
      image: withBasePath('/assets/media/pictures/IMG_1596.jpg'),
      imagePosition: 'center 20%',
      featured: true
    },
    {
      name: 'Rev. Dr. Martins Okoro',
      role: 'Senior Zonal Pastor',
      description: 'Foursquare Gospel Church, Mgbuoba',
      image: withBasePath('/assets/media/pictures/IMG_1824.png'),
      featured: true
    },
    {
      name: 'Bro. Babatunde Alepaye',
      role: 'Youth Pastor',
      description: 'Upperroom Mgbuoba',
      image: withBasePath('/assets/media/pictures/IMG_1785.png')
    },
    {
      name: 'Dr. Austen Sado',
      role: 'Youth Advisor',
      description: 'Upperroom Mgbuoba',
      image: withBasePath('/assets/media/pictures/IMG_1784.png')
    },
    {
      name: 'Pst. Dr. Wilson Sokari',
      role: 'Assistant Youth Pastor/Teens Pastor',
      description: 'Upperroom Mgbuoba',
      image: withBasePath('/assets/media/pictures/IMG_1793.png')
    }
    
  ]

  const featuredLeaders = leadership.filter((person) => person.featured)
  const spotlightLeaderName = 'Rev. Samuel Aboyeji'
  const spotlightFeaturedLeader = featuredLeaders.find((person) => person.name === spotlightLeaderName) || featuredLeaders[0]
  const secondaryFeaturedLeaders = featuredLeaders.filter((person) => person !== spotlightFeaturedLeader)
  const leadershipGrid = leadership.filter((person) => !person.featured)

  const excos = [
    { name: 'Sis. Rejoice Lazarus', role: 'Youth Vice President', image: withBasePath('/assets/media/pictures/IMG_1801.png') },
    { name: 'Bro. Gibson Ekikere', role: 'Youth President', image: withBasePath('/assets/media/pictures/IMG_1788.png') },
    { name: 'Bro. Thompson Ogemdi', role: 'Youth Church Secretary', image: withBasePath('/assets/media/pictures/IMG_1799.png') },
  ]

  const avatarTones = ['cross', 'dove', 'cup', 'crown']
  const getImageStyle = (person) => (person?.imagePosition ? { objectPosition: person.imagePosition } : undefined)

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
    { name: 'Follow Up', icon: 'fa-solid fa-user-check', description: 'Following up with members' },
  ]

  const unitModalContent = {
    Choir: {
      title: 'Choir Unit',
      subtitle: 'Serving through worship and music ministry',
      bulletStyle: 'interpunct',
      contact: {
        phone: '+2347031526399',
        whatsapp: '+2347031526399'
      },
      items: [
        'Join rehearsals and help lead heartfelt worship during services.',
        'Contribute your vocal or instrumental gift to the fellowship.',
        'Receive guidance on choir schedules, auditions, and commitment expectations.'
      ]
    },
    Media: {
      title: 'Media Unit',
      subtitle: 'Capturing and communicating ministry moments',
      bulletStyle: 'interpunct',
      contact: {
        phone: '+2347031526399',
        whatsapp: '+2347031526399'
      },
      items: [
        'Help with photography, video coverage, and media storytelling.',
        'Support projection, livestream, and digital content publishing.',
        'Get onboarded into media tools and service-day workflows.'
      ]
    },
    Ushers: {
      title: 'Ushers Unit',
      subtitle: 'Creating order and assisting worshippers',
      bulletStyle: 'interpunct',
      contact: {
        phone: '+2347031526399',
        whatsapp: '+2347031526399'
      },
      items: [
        'Welcome members and visitors with warmth and direction.',
        'Assist with seating flow and service coordination.',
        'Learn ushering guidelines and service etiquette.'
      ]
    },
    Drama: {
      title: 'Drama Unit',
      subtitle: 'Communicating truth through creative expression',
      bulletStyle: 'interpunct',
      contact: {
        phone: '+2347031526399',
        whatsapp: '+2347031526399'
      },
      items: [
        'Participate in stage drama, spoken-word, and creative presentations.',
        'Join script prep, rehearsals, and production planning.',
        'Use arts ministry to communicate the Gospel impactfully.'
      ]
    },
    Sanctuary: {
      title: 'Sanctuary Unit',
      subtitle: 'Maintaining a clean and prepared worship environment',
      bulletStyle: 'interpunct',
      contact: {
        phone: '+2347031526399',
        whatsapp: '+2347031526399'
      },
      items: [
        'Support cleaning and readiness of the worship space.',
        'Help arrange materials and maintain a welcoming atmosphere.',
        'Coordinate setup and post-service restoration routines.'
      ]
    },
    Protocol: {
      title: 'Protocol Unit',
      subtitle: 'Coordinating people, timing, and flow',
      bulletStyle: 'interpunct',
      contact: {
        phone: '+2347031526399',
        whatsapp: '+2347031526399'
      },
      items: [
        'Assist with order-of-service logistics and transitions.',
        'Coordinate movement and support for invited ministers and guests.',
        'Ensure smooth communication across service teams.'
      ]
    },
    Prayer: {
      title: 'Prayer Unit',
      subtitle: 'Covering the fellowship in intercession',
      bulletStyle: 'interpunct',
      contact: {
        phone: '+2347031526399',
        whatsapp: '+2347031526399'
      },
      items: [
        'Join scheduled prayer coverage for services and events.',
        'Share confidential prayer burdens for agreement and support.',
        'Grow in consistency and spiritual discipline through intercession.'
      ]
    },
    Greeters: {
      title: 'Greeters Unit',
      subtitle: 'Helping everyone feel seen and welcomed',
      bulletStyle: 'interpunct',
      contact: {
        phone: '+2347031526399',
        whatsapp: '+2347031526399'
      },
      items: [
        'Receive and welcome people at key entry points.',
        'Offer first-contact hospitality to guests and newcomers.',
        'Connect new faces to follow-up and relevant units.'
      ]
    },
    Welfare: {
      title: 'Welfare Unit Support',
      subtitle: 'How the Welfare unit can help you',
      bulletStyle: 'interpunct',
      contact: {
        phone: '+2347031526399',
        whatsapp: '+2347031526399'
      },
      items: [
        'Request practical help when you are going through a difficult season.',
        'Share urgent welfare concerns so the team can respond quickly.',
        'Get connected to members who can offer encouragement and care.'
      ]
    },
    'Follow Up': {
      title: 'Follow Up Unit Care',
      subtitle: 'What the Follow Up unit does',
      bulletStyle: 'interpunct',
      contact: {
        phone: '+2347031526399',
        whatsapp: '+2347031526399'
      },
      items: [
        'Welcomes first-time guests and helps them settle into fellowship life.',
        'Checks in with members who have been absent and offers support.',
        'Follows up after programs to pray, encourage, and answer questions.',
        'Connects members to departments, small groups, and next growth steps.'
      ]
    }
  }

  const [activeUnitModal, setActiveUnitModal] = useState(null)
  const activeUnitDetails = activeUnitModal ? unitModalContent[activeUnitModal] : null
  const activeUnitPhone = activeUnitDetails?.contact?.phone || DEFAULT_UNIT_PHONE
  const activeUnitWhatsAppPhone = activeUnitDetails?.contact?.whatsapp || activeUnitPhone
  const activeUnitCallHref = activeUnitPhone ? `tel:${activeUnitPhone}` : ''
  const activeUnitChatHref = createWhatsAppLink(
    activeUnitWhatsAppPhone,
    activeUnitModal ? `Hello, I would like to reach the ${activeUnitModal} unit.` : ''
  )
  const unitModalPanelRef = useRef(null)
  const unitModalCloseRef = useRef(null)
  const activeUnitTriggerRef = useRef(null)

  const openUnitModal = (unitName, triggerEl = null) => {
    if (!unitModalContent[unitName]) return
    activeUnitTriggerRef.current = triggerEl
    setActiveUnitModal(unitName)
  }

  const closeUnitModal = () => {
    setActiveUnitModal(null)
    requestAnimationFrame(() => {
      activeUnitTriggerRef.current?.focus()
    })
  }

  useEffect(() => {
    if (!activeUnitModal) return

    const handleEscape = (event) => {
      if (event.key === 'Escape') closeUnitModal()
      if (event.key !== 'Tab') return

      const panel = unitModalPanelRef.current
      if (!panel) return

      const focusable = panel.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable.length) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      const isShiftTab = event.shiftKey

      if (!isShiftTab && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      } else if (isShiftTab && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      }
    }

    document.addEventListener('keydown', handleEscape)
    document.body.classList.add('modal-open')
    const focusTimer = window.setTimeout(() => {
      unitModalCloseRef.current?.focus()
    }, 30)

    return () => {
      window.clearTimeout(focusTimer)
      document.removeEventListener('keydown', handleEscape)
      document.body.classList.remove('modal-open')
    }
  }, [activeUnitModal])

  return (
    <main id="main-content" className="team-page">
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
          {featuredLeaders.length > 0 && (
            <div className="team-spotlight">
              {spotlightFeaturedLeader && (
                <div className="team-spotlight__top">
                  <div className="team-card team-card--leadership team-card--spotlight">
                    <div className="team-card__image">
                      {spotlightFeaturedLeader.image ? (
                        <img
                          src={spotlightFeaturedLeader.image}
                          alt={spotlightFeaturedLeader.name}
                          className="team-card__photo"
                          loading="lazy"
                          style={getImageStyle(spotlightFeaturedLeader)}
                        />
                      ) : (
                        <div className="team-card__placeholder team-card__placeholder--cross">
                          <span>{getInitials(spotlightFeaturedLeader.name)}</span>
                          <small>{spotlightFeaturedLeader.role}</small>
                        </div>
                      )}
                    </div>
                    <h3>{spotlightFeaturedLeader.name}</h3>
                    <p className="team-card__role">{spotlightFeaturedLeader.role}</p>
                    <p className="team-card__desc">{spotlightFeaturedLeader.description}</p>
                  </div>
                </div>
              )}

              {secondaryFeaturedLeaders.length > 0 && (
                <div className="team-spotlight__grid team-spotlight__grid--secondary">
                  {secondaryFeaturedLeaders.map((person, index) => (
                    <div key={`${person.name}-${index}`} className="team-card team-card--leadership team-card--spotlight">
                      <div className="team-card__image">
                        {person.image ? (
                          <img
                            src={person.image}
                            alt={person.name}
                            className="team-card__photo"
                            loading="lazy"
                            style={getImageStyle(person)}
                          />
                        ) : (
                          <div className={`team-card__placeholder team-card__placeholder--${avatarTones[index % avatarTones.length]}`}>
                            <span>{getInitials(person.name)}</span>
                            <small>{person.role}</small>
                          </div>
                        )}
                      </div>
                      <h3>{person.name}</h3>
                      <p className="team-card__role">{person.role}</p>
                      <p className="team-card__desc">{person.description}</p>
                    </div>
                  ))}
                </div>
              )}
              </div>
          )}
          <div className="team-grid team-grid--3">
            {leadershipGrid.map((person, index) => (
              <div key={index} className="team-card team-card--leadership">
                <div className="team-card__image">
                  {person.image ? (
                    <img
                      src={person.image}
                      alt={person.name}
                      className="team-card__photo"
                      loading="lazy"
                      style={getImageStyle(person)}
                    />
                  ) : (
                    <div className={`team-card__placeholder team-card__placeholder--${avatarTones[index % avatarTones.length]}`}>
                      <span>{getInitials(person.name)}</span>
                      <small>{person.role}</small>
                    </div>
                  )}
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
                  {person.image ? (
                    <img
                      src={person.image}
                      alt={person.name}
                      className="team-card__photo"
                      loading="lazy"
                      style={getImageStyle(person)}
                    />
                  ) : (
                    <div className={`team-card__placeholder team-card__placeholder--${avatarTones[index % avatarTones.length]}`}>
                      <span>{getInitials(person.name)}</span>
                      <small>{person.role}</small>
                    </div>
                  )}
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
            {departments.map((dept, index) => {
              const isInteractive = Boolean(unitModalContent[dept.name])
              const interactiveProps = isInteractive
                ? {
                    onClick: (event) => openUnitModal(dept.name, event.currentTarget),
                    onKeyDown: (event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        openUnitModal(dept.name, event.currentTarget)
                      }
                    },
                    role: 'button',
                    tabIndex: 0,
                    'aria-label': `Open ${dept.name} details`,
                    'aria-haspopup': 'dialog',
                    'aria-expanded': activeUnitModal === dept.name
                  }
                : {}

              return (
                <div
                  key={index}
                  className={`dept-card${isInteractive ? ' dept-card--interactive' : ''}`}
                  {...interactiveProps}
                >
                  <span className="dept-card__icon">
                    <i className={dept.icon}></i>
                  </span>
                  <h3>{dept.name}</h3>
                  <p>{dept.description}</p>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {activeUnitDetails && (
        <div className="team-unit-modal" role="dialog" aria-modal="true" aria-labelledby="team-unit-modal-title">
          <button type="button" className="team-unit-modal__backdrop" onClick={closeUnitModal} aria-label="Close unit details modal" />
          <div ref={unitModalPanelRef} className="team-unit-modal__panel">
            <button
              ref={unitModalCloseRef}
              type="button"
              className="team-unit-modal__close"
              onClick={closeUnitModal}
              aria-label="Close unit details modal"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
            <div className="team-unit-modal__content">
              <h3 id="team-unit-modal-title">{activeUnitDetails.title}</h3>
              <p className="team-unit-modal__subtitle">{activeUnitDetails.subtitle}</p>
              <ul>
                {activeUnitDetails.items.map((item) => (
                  <li key={item}>
                    {activeUnitDetails.bulletStyle === 'interpunct' ? <span className="team-unit-modal__bullet">·</span> : null}
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
              {(activeUnitCallHref || activeUnitChatHref) ? (
                <div className="team-unit-modal__actions">
                  {activeUnitCallHref ? (
                    <a className="team-unit-modal__action team-unit-modal__action--call" href={activeUnitCallHref}>
                      <i className="fa-solid fa-phone"></i>
                      Call Unit
                    </a>
                  ) : null}
                  {activeUnitChatHref ? (
                    <a className="team-unit-modal__action team-unit-modal__action--chat" href={activeUnitChatHref} target="_blank" rel="noopener noreferrer">
                      <i className="fa-brands fa-whatsapp"></i>
                      Chat on WhatsApp
                    </a>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default Team
