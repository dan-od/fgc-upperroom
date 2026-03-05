import { SectionHeader } from '../../components/common'
import './Media.css'

const Media = () => (
  <main className="media-page">
    <section className="page-banner bg-purple">
      <div className="container">
        <h1>Media</h1>
        <p>Photos, videos, and sermons</p>
      </div>
    </section>
    <section className="media-section">
      <div className="container">
        <SectionHeader tag="Gallery" title="Our Moments" subtitle="Capturing God's work in our midst" />
        <div className="gallery-grid">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="gallery-item">
              <div className="gallery-placeholder">Photo {i}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  </main>
)

export default Media
