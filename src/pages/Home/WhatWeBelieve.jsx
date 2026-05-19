import { Button, SectionHeader } from '../../components/common'
import { toAssetUrl } from '../../utils/appPaths'

const HERO_ICONS = {
  cross: toAssetUrl('assets/icons/icon-cross.png'),
  dove: toAssetUrl('assets/icons/icon-dove.png'),
  cup: toAssetUrl('assets/icons/icon-cup.png'),
  crown: toAssetUrl('assets/icons/icon-crown.png')
}

const beliefs = [
  {
    title: 'Jesus the Savior',
    description: 'Salvation through faith in Jesus Christ, who died for our sins and rose for our justification.',
    color: 'red',
    icon: HERO_ICONS.cross
  },
  {
    title: 'Jesus the Baptizer',
    description: 'Baptism of the Holy Spirit with evidence of speaking in tongues, empowering believers.',
    color: 'yellow',
    icon: HERO_ICONS.dove
  },
  {
    title: 'Jesus the Healer',
    description: 'Divine healing through faith in Jesus Christ, who bore our sicknesses and diseases.',
    color: 'blue',
    icon: HERO_ICONS.cup
  },
  {
    title: 'Jesus the Coming Soon King',
    description: 'The imminent, personal return of our Lord Jesus Christ to establish His kingdom.',
    color: 'purple',
    icon: HERO_ICONS.crown
  }
]

const WhatWeBelieve = () => (
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

export default WhatWeBelieve
