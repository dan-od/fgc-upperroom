import { toAssetUrl } from '../../../utils/appPaths'
import './LoadingScreen.css'

const LOADER_ICONS = [
  { src: toAssetUrl('assets/icons/icon-cross.png'), alt: 'Jesus the Savior symbol' },
  { src: toAssetUrl('assets/icons/icon-dove.png'), alt: 'Jesus the Baptizer symbol' },
  { src: toAssetUrl('assets/icons/icon-cup.png'), alt: 'Jesus the Healer symbol' },
  { src: toAssetUrl('assets/icons/icon-crown.png'), alt: 'Jesus the Coming King symbol' }
]

const LoadingScreen = ({ label = 'Loading Upperroom' }) => {
  return (
    <div className="loading-screen" role="status" aria-live="polite" aria-label={label}>
      <div className="loading-screen__backdrop" />
      <div className="loading-screen__content">
        <div className="loading-screen__halo loading-screen__halo--left" aria-hidden="true" />
        <div className="loading-screen__halo loading-screen__halo--right" aria-hidden="true" />

        <div className="loading-screen__panel">
          <span className="loading-screen__eyebrow">Upperroom Mgbuoba</span>
          <div className="loading-screen__icons" aria-hidden="true">
            {LOADER_ICONS.map((icon, index) => (
              <span
                key={icon.src}
                className="loading-screen__icon-shell"
                style={{ '--loading-icon-delay': `${index * 0.14}s` }}
              >
                <img src={icon.src} alt="" className="loading-screen__icon" />
              </span>
            ))}
          </div>
          <div className="loading-screen__pulse-line" aria-hidden="true">
            <span />
          </div>
          <p className="loading-screen__title">{label}</p>
          <p className="loading-screen__subtitle">Preparing your next page</p>
        </div>
      </div>
    </div>
  )
}

export default LoadingScreen
