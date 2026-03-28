import { Link } from 'react-router-dom'
import './NotFound.css'

const NotFound = () => (
  <main id="main-content" className="not-found-page">
    <section className="page-banner bg-blue">
      <div className="container">
        <h1>404</h1>
        <p>Page Not Found</p>
      </div>
    </section>

    <section className="not-found-section">
      <div className="container">
        <div className="not-found-content">
          <i className="fa-solid fa-compass not-found-icon" aria-hidden="true" />
          <h2>We can't find that page</h2>
          <p>
            The link may have changed or the page no longer exists. Let's get you back on track.
          </p>
          <div className="not-found-actions">
            <Link to="/" className="btn btn--primary btn--lg">Go to Home</Link>
            <Link to="/contact" className="btn btn--outline btn--lg">Contact Us</Link>
          </div>
        </div>
      </div>
    </section>
  </main>
)

export default NotFound
