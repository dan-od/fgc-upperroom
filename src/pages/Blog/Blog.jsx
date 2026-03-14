import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { X, Calendar, User, Clock, Download } from 'lucide-react'
import { Sidebar } from '../../components/Sidebar'
import { BlogCard } from '../../components/BlogCard'
import { subscribeVisitor, hasSubscribed } from '../../utils/subscribeApi'
import { BLOG_POSTS } from '../../constants'
import './Blog.css'

const formatPostDate = (value) => {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return 'Unknown date'
  }

  return date.toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

const Blog = () => {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPost, setSelectedPost] = useState(null)
  const [showSubscribeModal, setShowSubscribeModal] = useState(false)
  const [subscribeStatus, setSubscribeStatus] = useState(null)
  const [subscribeMessage, setSubscribeMessage] = useState('')
  const [subscribeForm, setSubscribeForm] = useState({ name: '', phone: '', email: '' })

  const sortedPosts = useMemo(() => {
    return [...BLOG_POSTS].sort((a, b) => {
      const aDate = new Date(a.date).getTime()
      const bDate = new Date(b.date).getTime()

      if (Number.isNaN(aDate) || Number.isNaN(bDate)) return 0
      return bDate - aDate
    })
  }, [])

  const filteredPosts = useMemo(() => {
    return sortedPosts.filter((post) => {
      const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory
      const normalizedQuery = searchQuery.toLowerCase()
      const matchesSearch =
        post.title.toLowerCase().includes(normalizedQuery) ||
        post.excerpt.toLowerCase().includes(normalizedQuery) ||
        post.author.toLowerCase().includes(normalizedQuery)

      return matchesCategory && matchesSearch
    })
  }, [selectedCategory, searchQuery, sortedPosts])

  const downloadMaterial = (post) => {
    if (post.category !== 'Sunday School') {
      return
    }

    const slug = post.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')

    const content = [
      `Sunday School Material`,
      ``,
      `Title: ${post.title}`,
      `Author: ${post.author}`,
      `Date: ${formatPostDate(post.date)}`,
      `Read Time: ${post.readTime}`,
      ``,
      `Summary`,
      `${post.excerpt}`,
      ``,
      `Lesson Notes`,
      `${post.content}`
    ].join('\n')

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${slug || 'sunday-school-material'}.txt`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const openSubscribeModal = () => {
    setSubscribeStatus(null)
    setSubscribeMessage('')
    setSubscribeForm({ name: '', phone: '', email: '' })
    setShowSubscribeModal(true)
  }

  const closeSubscribeModal = () => {
    setShowSubscribeModal(false)
  }

  const handleSubscribeChange = (e) => {
    const { name, value } = e.target
    setSubscribeForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubscribeSubmit = async (e) => {
    e.preventDefault()

    if (hasSubscribed()) {
      setSubscribeStatus('success')
      setSubscribeMessage('You are already subscribed. Thank you!')
      return
    }

    const result = await subscribeVisitor(subscribeForm)

    setSubscribeStatus(result.ok ? 'success' : 'error')
    setSubscribeMessage(result.message)

    if (result.ok) {
      setTimeout(() => closeSubscribeModal(), 2500)
    }
  }

  return (
    <>
      <main className="blog-page">
        <section className="page-banner bg-blue blog-banner">
          <div className="container">
            <h1>Blog</h1>
            <p>Faith-filled reflections, practical teaching notes, and stories from our fellowship.</p>
          </div>
        </section>

        <section className="blog-feed-section">
          <div className="container">
            <div className="blog-feed-layout">
              <Sidebar
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                onSubscribe={openSubscribeModal}
              />

              <section className="blog-feed-main" aria-label="Blog posts feed">
                <div className="blog-feed-main__heading">
                  <h3>
                    {selectedCategory}
                    {searchQuery && <span>{` • Results for "${searchQuery}"`}</span>}
                  </h3>
                  <p>
                    Showing {filteredPosts.length} {filteredPosts.length === 1 ? 'post' : 'posts'}
                  </p>
                </div>

                <div className="blog-feed-grid">
                  <AnimatePresence mode="popLayout">
                    {filteredPosts.map((post) => (
                      <BlogCard
                        key={post.id}
                        post={post}
                        onReadMore={setSelectedPost}
                        onDownloadMaterial={downloadMaterial}
                      />
                    ))}
                  </AnimatePresence>
                </div>

                {filteredPosts.length === 0 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="blog-feed-empty">
                    <h4>No posts found</h4>
                    <p>Try adjusting your search or category filter.</p>
                  </motion.div>
                )}
              </section>
            </div>
          </div>
        </section>
      </main>

      <AnimatePresence>
        {selectedPost && (
          <div className="blog-modal" role="dialog" aria-modal="true" aria-label={selectedPost.title}>
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedPost(null)}
              className="blog-modal__backdrop"
              aria-label="Close blog post details"
            />

            <motion.article
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="blog-modal__panel"
            >
              <button
                type="button"
                onClick={() => setSelectedPost(null)}
                className="blog-modal__close"
                aria-label="Close post"
              >
                <X size={18} />
              </button>

              <div className="blog-modal__scroll">
                <div className="blog-modal__hero">
                  <img src={selectedPost.imageUrl} alt={selectedPost.title} className="blog-modal__hero-image" />
                  <div className="blog-modal__hero-overlay" />
                  <div className="blog-modal__hero-content">
                    <span>{selectedPost.category}</span>
                    <h2>{selectedPost.title}</h2>
                  </div>
                </div>

                <div className="blog-modal__body">
                  <div className="blog-modal__meta">
                    <div>
                      <User size={14} />
                      <strong>{selectedPost.author}</strong>
                    </div>
                    <div>
                      <Calendar size={14} />
                      <span>{formatPostDate(selectedPost.date)}</span>
                    </div>
                    <div>
                      <Clock size={14} />
                      <span>{selectedPost.readTime}</span>
                    </div>
                  </div>

                  {selectedPost.category === 'Sunday School' && (
                    <button
                      type="button"
                      className="blog-modal__download"
                      onClick={() => downloadMaterial(selectedPost)}
                    >
                      <Download size={14} />
                      <span>Download Material</span>
                    </button>
                  )}

                  <p className="blog-modal__excerpt">{selectedPost.excerpt}</p>

                  <div className="blog-modal__content">
                    <p>{selectedPost.content}</p>
                  </div>
                </div>
              </div>
            </motion.article>
          </div>
        )}

        {showSubscribeModal && (
          <div className="blog-subscribe-modal" role="dialog" aria-modal="true" aria-label="Subscribe to updates">
            <motion.button
              type="button"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeSubscribeModal}
              className="blog-subscribe-modal__backdrop"
              aria-label="Close subscribe modal"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.92 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.92 }}
              className="blog-subscribe-modal__panel"
            >
              <button
                type="button"
                className="blog-subscribe-modal__close"
                onClick={closeSubscribeModal}
                aria-label="Close subscribe modal"
              >
                <X size={18} />
              </button>

              <div className="blog-subscribe-modal__header">
                <h2>Subscribe for updates</h2>
                <p>Get new blog posts, event updates, and encouragement delivered to your inbox.</p>
              </div>

              {subscribeStatus === 'success' ? (
                <div className="blog-subscribe-modal__message blog-subscribe-modal__message--success">
                  {subscribeMessage}
                </div>
              ) : (
                <form className="blog-subscribe-modal__form" onSubmit={handleSubscribeSubmit}>
                  <label>
                    <span>Name</span>
                    <input
                      name="name"
                      value={subscribeForm.name}
                      onChange={handleSubscribeChange}
                      required
                      placeholder="Your full name"
                    />
                  </label>

                  <label>
                    <span>WhatsApp Number</span>
                    <input
                      name="phone"
                      value={subscribeForm.phone}
                      onChange={handleSubscribeChange}
                      required
                      placeholder="+234 8123456789"
                    />
                  </label>

                  <label>
                    <span>Email</span>
                    <input
                      type="email"
                      name="email"
                      value={subscribeForm.email}
                      onChange={handleSubscribeChange}
                      required
                      placeholder="you@example.com"
                    />
                  </label>

                  {subscribeStatus === 'error' && (
                    <div className="blog-subscribe-modal__message blog-subscribe-modal__message--error">
                      {subscribeMessage}
                    </div>
                  )}

                  <button type="submit" className="blog-subscribe-modal__submit">
                    Subscribe
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  )
}

export default Blog
