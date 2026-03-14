import { useEffect, useMemo, useState } from 'react'
import {
  BookOpen,
  Edit2,
  FileText,
  GraduationCap,
  Heart,
  Plus,
  Search,
  Sparkles,
  Star,
  Trash2
} from 'lucide-react'
import {
  BLOG_CATEGORIES,
  estimateReadTime,
  formatBlogCategory,
  getTagList,
  seedBlogPostsIfEmpty,
  writeBlogPosts
} from '../../../utils/blogStorage'
import './BlogManager.css'

const categoryIcons = {
  article: FileText,
  devotional: Heart,
  'sunday-school': GraduationCap,
  testimony: BookOpen
}

const createEmptyPost = () => ({
  id: Date.now(),
  title: '',
  content: '',
  category: 'article',
  author: '',
  excerpt: '',
  tags: '',
  featured: false,
  status: 'published',
  image: '',
  createdAt: null,
  updatedAt: null
})

const buildExcerpt = (content) => {
  const plain = String(content || '').replace(/\s+/g, ' ').trim()
  if (!plain) {
    return 'No excerpt provided yet.'
  }

  if (plain.length <= 170) {
    return plain
  }

  return `${plain.slice(0, 167)}...`
}

const BlogManager = () => {
  const [view, setView] = useState('list')
  const [posts, setPosts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [formData, setFormData] = useState(createEmptyPost)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    setPosts(seedBlogPostsIfEmpty())
  }, [])

  const persistPosts = (updatedPosts) => {
    setPosts(updatedPosts)
    writeBlogPosts(updatedPosts)
  }

  const resetForm = () => {
    setFormData(createEmptyPost())
    setView('list')
  }

  const openCreate = () => {
    setNotice(null)
    setFormData(createEmptyPost())
    setView('create')
  }

  const handleChange = (event) => {
    const { name, value, type, checked } = event.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const savePost = (targetStatus = formData.status) => {
    const title = formData.title.trim()
    const author = formData.author.trim()
    const content = formData.content.trim()

    if (!title || !author || !content) {
      setNotice({ tone: 'error', text: 'Title, author, and content are required.' })
      return
    }

    const now = new Date().toISOString()

    const payload = {
      ...formData,
      title,
      author,
      content,
      excerpt: formData.excerpt.trim() || buildExcerpt(content),
      tags: getTagList(formData.tags).join(', '),
      status: targetStatus,
      image: formData.image.trim(),
      updatedAt: now
    }

    if (view === 'create') {
      const newPost = {
        ...payload,
        id: Date.now(),
        createdAt: now,
        updatedAt: null
      }

      persistPosts([newPost, ...posts])
      setNotice({ tone: 'success', text: targetStatus === 'draft' ? 'Draft saved.' : 'Post published.' })
      resetForm()
      return
    }

    const updatedPosts = posts.map((post) => {
      if (post.id !== formData.id) {
        return post
      }

      return {
        ...payload,
        id: post.id,
        createdAt: post.createdAt || now
      }
    })

    persistPosts(updatedPosts)
    setNotice({ tone: 'success', text: 'Post updated successfully.' })
    resetForm()
  }

  const handleSubmit = (event) => {
    event.preventDefault()
    savePost('published')
  }

  const handleSaveDraft = () => {
    if (!formData.title.trim()) {
      setNotice({ tone: 'error', text: 'Enter a title before saving a draft.' })
      return
    }

    savePost('draft')
  }

  const handleEdit = (post) => {
    setNotice(null)
    setFormData({ ...post })
    setView('edit')
  }

  const handleDelete = (id) => {
    if (!window.confirm('Delete this blog post?')) {
      return
    }

    persistPosts(posts.filter((post) => post.id !== id))
    setNotice({ tone: 'success', text: 'Post deleted.' })
  }

  const handleQuickPublish = (post) => {
    if (post.status === 'published') {
      return
    }

    const updatedPosts = posts.map((item) => {
      if (item.id !== post.id) {
        return item
      }

      return {
        ...item,
        status: 'published',
        updatedAt: new Date().toISOString()
      }
    })

    persistPosts(updatedPosts)
    setNotice({ tone: 'success', text: 'Draft published successfully.' })
  }

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      const term = searchTerm.toLowerCase()
      const matchesSearch =
        post.title.toLowerCase().includes(term) ||
        post.author.toLowerCase().includes(term) ||
        post.tags.toLowerCase().includes(term)

      const matchesCategory = filterCategory === 'all' || post.category === filterCategory
      const matchesStatus = filterStatus === 'all' || post.status === filterStatus

      return matchesSearch && matchesCategory && matchesStatus
    })
  }, [posts, searchTerm, filterCategory, filterStatus])

  const stats = useMemo(() => {
    const published = posts.filter((post) => post.status === 'published').length
    const drafts = posts.filter((post) => post.status === 'draft').length
    const featured = posts.filter((post) => post.featured).length

    return {
      total: posts.length,
      published,
      drafts,
      featured
    }
  }, [posts])

  const contentWordCount = useMemo(() => {
    return String(formData.content || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean).length
  }, [formData.content])

  const formTags = getTagList(formData.tags)
  const previewImage = formData.image.trim()
  const previewText = formData.excerpt.trim() || buildExcerpt(formData.content)
  const previewBody = String(formData.content || '').trim()

  if (view === 'create' || view === 'edit') {
    return (
      <div className="admin-blog admin-blog--editor">
        {notice && (
          <div className={`admin-blog__notice admin-blog__notice--${notice.tone}`}>
            {notice.text}
          </div>
        )}

        <div className="admin-blog__editor-head">
          <button type="button" onClick={resetForm} className="admin-blog__ghost-btn">
            ← Back to Posts
          </button>
          <div>
            <h1>{view === 'create' ? 'Create New Post' : 'Edit Post'}</h1>
            <p>Manage category, content, and publishing options in one place.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="admin-blog__editor-layout">
          <section className="admin-blog__panel">
            <h2>Category</h2>
            <div className="admin-blog__category-grid">
              {BLOG_CATEGORIES.map((category) => {
                const Icon = categoryIcons[category.value] || FileText
                const isActive = formData.category === category.value

                return (
                  <label
                    key={category.value}
                    className={`admin-blog__category-option ${isActive ? 'is-active' : ''}`}
                  >
                    <input
                      type="radio"
                      name="category"
                      value={category.value}
                      checked={isActive}
                      onChange={handleChange}
                    />
                    <Icon size={20} />
                    <span>{category.label}</span>
                  </label>
                )
              })}
            </div>
          </section>

          <section className="admin-blog__panel">
            <h2>Post Details</h2>
            <div className="admin-blog__field-grid admin-blog__field-grid--details">
              <label className="admin-blog__field">
                <span>Title</span>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="Enter post title"
                />
              </label>

              <label className="admin-blog__field">
                <span>Author</span>
                <input
                  type="text"
                  name="author"
                  value={formData.author}
                  onChange={handleChange}
                  required
                  placeholder="Author name"
                />
              </label>

              <label className="admin-blog__field admin-blog__field--full">
                <span>Cover Image URL</span>
                <input
                  type="text"
                  name="image"
                  value={formData.image}
                  onChange={handleChange}
                  placeholder="/assets/media/events/images/teens_summit2026.png"
                />
              </label>
            </div>
          </section>

          <section className="admin-blog__panel">
            <h2>Content</h2>
            <div className="admin-blog__field-grid">
              <label className="admin-blog__field admin-blog__field--full">
                <span>Excerpt</span>
                <textarea
                  name="excerpt"
                  value={formData.excerpt}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Short summary of the post"
                />
              </label>

              <label className="admin-blog__field admin-blog__field--full">
                <span>Main Content</span>
                <textarea
                  name="content"
                  value={formData.content}
                  onChange={handleChange}
                  required
                  rows={12}
                  placeholder="Write your post content"
                  className="admin-blog__content-input"
                />
              </label>
            </div>
          </section>

          <section className="admin-blog__panel">
            <h2>Tags & Publishing</h2>
            <div className="admin-blog__field-grid admin-blog__field-grid--publish">
              <label className="admin-blog__field">
                <span>Tags (comma separated)</span>
                <input
                  type="text"
                  name="tags"
                  value={formData.tags}
                  onChange={handleChange}
                  placeholder="faith, prayer, youth"
                />
              </label>

              <label className="admin-blog__field">
                <span>Status</span>
                <select name="status" value={formData.status} onChange={handleChange}>
                  <option value="published">Published</option>
                  <option value="draft">Draft</option>
                </select>
              </label>
            </div>

            <label className="admin-blog__checkbox">
              <input
                type="checkbox"
                name="featured"
                checked={formData.featured}
                onChange={handleChange}
              />
              <span>Feature this post on the public blog</span>
            </label>

            {formTags.length > 0 && (
              <div className="admin-blog__tag-preview" aria-label="Tag preview">
                {formTags.map((tag) => (
                  <span key={tag}>{tag}</span>
                ))}
              </div>
            )}

            <div className="admin-blog__editor-actions">
              <button type="submit" className="admin-blog__primary-btn">
                {view === 'create' ? 'Publish Post' : 'Update Post'}
              </button>

              <button type="button" onClick={handleSaveDraft} className="admin-blog__secondary-btn">
                Save Draft
              </button>

              <button type="button" onClick={resetForm} className="admin-blog__ghost-btn">
                Cancel
              </button>
            </div>
          </section>

          <aside className="admin-blog__panel admin-blog__panel--preview">
            <div className="admin-blog__preview-head">
              <Sparkles size={18} />
              <h2>Live Preview</h2>
            </div>

            <div className="admin-blog__preview-card">
              <div className="admin-blog__preview-image-wrap">
                {previewImage ? (
                  <img src={previewImage} alt="Post cover preview" className="admin-blog__preview-image" />
                ) : (
                  <div className="admin-blog__preview-image-fallback">Cover image preview</div>
                )}

                <span className="admin-blog__preview-category">{formatBlogCategory(formData.category)}</span>
                <span className={`admin-blog__preview-status admin-blog__preview-status--${formData.status}`}>
                  {formData.status}
                </span>
              </div>

              <div className="admin-blog__preview-body">
                <h3>{formData.title.trim() || 'Your title will appear here'}</h3>
                <p>{previewText}</p>

                {formTags.length > 0 && (
                  <div className="admin-blog__preview-tags">
                    {formTags.slice(0, 4).map((tag) => (
                      <span key={`preview-${tag}`}>{tag}</span>
                    ))}
                  </div>
                )}

                <div className="admin-blog__preview-meta">
                  <span>By {formData.author.trim() || 'Author name'}</span>
                  <span>{estimateReadTime(formData.content)} min read</span>
                  <span>{contentWordCount} words</span>
                </div>

                <div className="admin-blog__preview-foot">
                  <strong>Body Preview</strong>
                  <p>{previewBody || 'Start writing content to preview paragraph flow and rhythm.'}</p>
                </div>
              </div>
            </div>
          </aside>
        </form>
      </div>
    )
  }

  return (
    <div className="admin-blog">
      {notice && <div className={`admin-blog__notice admin-blog__notice--${notice.tone}`}>{notice.text}</div>}

      <div className="admin-blog__head">
        <div>
          <h1>Blog Management</h1>
          <p>Create, update, and publish church blog content.</p>
        </div>
        <button type="button" onClick={openCreate} className="admin-blog__primary-btn">
          <Plus size={16} />
          <span>New Post</span>
        </button>
      </div>

      <div className="admin-blog__stats-grid">
        <article className="admin-blog__stat-card">
          <span>Total Posts</span>
          <strong>{stats.total}</strong>
        </article>
        <article className="admin-blog__stat-card">
          <span>Published</span>
          <strong>{stats.published}</strong>
        </article>
        <article className="admin-blog__stat-card">
          <span>Drafts</span>
          <strong>{stats.drafts}</strong>
        </article>
        <article className="admin-blog__stat-card">
          <span>Featured</span>
          <strong>{stats.featured}</strong>
        </article>
      </div>

      <section className="admin-blog__panel">
        <div className="admin-blog__filters">
          <label className="admin-blog__search">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search posts by title, author, or tag"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </label>

          <select value={filterCategory} onChange={(event) => setFilterCategory(event.target.value)}>
            <option value="all">All Categories</option>
            {BLOG_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>

          <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value)}>
            <option value="all">All Status</option>
            <option value="published">Published</option>
            <option value="draft">Draft</option>
          </select>
        </div>
      </section>

      <div className="admin-blog__post-list">
        {filteredPosts.map((post) => {
          const Icon = categoryIcons[post.category] || FileText
          const tags = getTagList(post.tags)

          return (
            <article key={post.id} className="admin-blog__post-card">
              <div className="admin-blog__post-main">
                <div className="admin-blog__post-meta-top">
                  <span className="admin-blog__post-category">
                    <Icon size={14} />
                    {formatBlogCategory(post.category)}
                  </span>
                  <span className={`admin-blog__status-pill admin-blog__status-pill--${post.status}`}>
                    {post.status}
                  </span>
                  {post.featured && (
                    <span className="admin-blog__featured-pill">
                      <Star size={12} /> Featured
                    </span>
                  )}
                </div>

                <h3>{post.title}</h3>
                <p>{post.excerpt || 'No excerpt provided.'}</p>

                <div className="admin-blog__post-meta-bottom">
                  <span>By {post.author}</span>
                  <span>{new Date(post.createdAt).toLocaleDateString()}</span>
                  <span>{estimateReadTime(post.content)} min read</span>
                </div>

                {tags.length > 0 && (
                  <div className="admin-blog__tag-preview">
                    {tags.map((tag) => (
                      <span key={`${post.id}-${tag}`}>{tag}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="admin-blog__post-actions">
                <button type="button" onClick={() => handleEdit(post)} className="admin-blog__icon-btn">
                  <Edit2 size={14} />
                  <span>Edit</span>
                </button>

                {post.status === 'draft' && (
                  <button
                    type="button"
                    onClick={() => handleQuickPublish(post)}
                    className="admin-blog__icon-btn admin-blog__icon-btn--publish"
                  >
                    <Sparkles size={14} />
                    <span>Publish</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleDelete(post.id)}
                  className="admin-blog__icon-btn admin-blog__icon-btn--danger"
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              </div>
            </article>
          )
        })}
      </div>

      {filteredPosts.length === 0 && (
        <div className="admin-blog__empty">
          <h3>No posts match your filters.</h3>
          <p>Adjust search or filter options, or create a new post.</p>
          <button type="button" onClick={openCreate} className="admin-blog__primary-btn">
            Create Post
          </button>
        </div>
      )}
    </div>
  )
}

export default BlogManager
