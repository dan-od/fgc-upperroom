import { SectionHeader } from '../../components/common'
import './Blog.css'

const Blog = () => (
  <main className="blog-page">
    <section className="page-banner bg-blue">
      <div className="container">
        <h1>Blog</h1>
        <p>Devotionals, articles, and updates</p>
      </div>
    </section>
    <section className="blog-section">
      <div className="container">
        <SectionHeader tag="Articles" title="Latest Posts" />
        <div className="blog-grid">
          {[1,2,3].map(i => (
            <div key={i} className="blog-card">
              <div className="blog-card__image">Blog Image</div>
              <div className="blog-card__content">
                <span className="blog-card__date">January 2025</span>
                <h3>Blog Post Title {i}</h3>
                <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor...</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  </main>
)

export default Blog
