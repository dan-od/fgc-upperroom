import { toAssetUrl } from '../../../utils/appPaths'
import './FoursquareIcons.css'

const FoursquareIcons = () => {
  const icons = [
    { src: toAssetUrl('assets/icons/icon-cross.png'), alt: 'Jesus the Savior symbol' },
    { src: toAssetUrl('assets/icons/icon-dove.png'), alt: 'Jesus the Baptizer symbol' },
    { src: toAssetUrl('assets/icons/icon-cup.png'), alt: 'Jesus the Healer symbol' },
    { src: toAssetUrl('assets/icons/icon-crown.png'), alt: 'Jesus the Coming King symbol' },
  ]

  return (
    <section className="fsq-icons">
      <div className="container">
        <div className="fsq-icons__wrapper">
          {icons.map((icon) => (
            <img
              key={icon.src}
              src={icon.src}
              alt={icon.alt}
              className="fsq-icons__icon"
            />
          ))}
        </div>
      </div>
    </section>
  )
}

export default FoursquareIcons
