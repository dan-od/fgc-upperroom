import { toAssetUrl } from '../../utils/appPaths'

const PASTOR_PHOTO = toAssetUrl('assets/media/pictures/Senior Pastor_Home.jpeg')

const PastorWelcome = () => (
  <section className="pastor-welcome">
    <div className="container">
      <div className="pastor-welcome__grid">
        <div className="pastor-welcome__image">
          <img src={PASTOR_PHOTO} alt="Pastor Photo" />
        </div>
        <div className="pastor-welcome__content">
          <span className="pastor-welcome__tag">From Our Senior Pastor</span>
          <h2>Welcome to Our Family</h2>
          <p>
            On behalf of the entire Foursquare Gospel Church, Mgbuoba Zonal Headquarters,
            I warmly welcome you to our youth fellowship - The Upperroom. We believe that God
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

export default PastorWelcome
