import { useState, useEffect } from 'react'
import { FileText, BookOpen, Heart, GraduationCap, Search, Edit2, Trash2, Star } from 'lucide-react'

const categories = [
  { value: 'article', label: 'Article', icon: FileText },
  { value: 'devotional', label: 'Devotional', icon: Heart },
  { value: 'sunday-school', label: 'Sunday School', icon: GraduationCap },
  { value: 'testimony', label: 'Testimony', icon: BookOpen }
]

const emptyPost = {
  id: Date.now(),
  title: '',
  content: '',
  category: 'article',
  author: '',
  excerpt: '',
  tags: '',
  featured: false,
  status: 'published'
}

const BlogManager = () => {
  const [view, setView] = useState('list')
  const [posts, setPosts] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [formData, setFormData] = useState(emptyPost)

  useEffect(() => {
    const stored = localStorage.getItem('admin_blog_posts')
    if (stored) {
      setPosts(JSON.parse(stored))
      return
    }

    const demoPosts = [
      {
        id: 1,
        title: 'Walking by Faith in Difficult Times',
        content: 'Faith is not the absence of storms, but confidence in God through them.',
        category: 'devotional',
        author: 'Pastor Emmanuel',
        excerpt: 'How to stay grounded in God during uncertainty.',
        tags: 'faith, prayer, trust',
        featured: true,
        status: 'published',
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        title: 'Youth Bible Study Notes - Romans 12',
        content: 'Be transformed by renewing your mind daily through scripture and prayer.',
        category: 'sunday-school',
        author: 'Youth Team',
        excerpt: 'Key takeaways from this week’s youth class.',
        tags: 'youth, bible-study',
        featured: false,
        status: 'draft',
        createdAt: new Date().toISOString()
      }
    ]

    setPosts(demoPosts)
    localStorage.setItem('admin_blog_posts', JSON.stringify(demoPosts))
  }, [])

  const persistPosts = (updatedPosts) => {
    setPosts(updatedPosts)
    localStorage.setItem('admin_blog_posts', JSON.stringify(updatedPosts))
  }

  const resetForm = () => {
    setFormData({ ...emptyPost, id: Date.now() })
    setView('list')
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const savePost = (status) => {
    const payload = {
      ...formData,
      status,
      createdAt: formData.createdAt || new Date().toISOString()
    }

    if (view === 'create') {
      persistPosts([...posts, { ...payload, id: Date.now() }])
      alert(status === 'draft' ? 'Draft saved!' : 'Post published!')
    } else {
      const updated = posts.map((post) => (post.id === formData.id ? payload : post))
      persistPosts(updated)
      alert('Post updated successfully!')
    }

    resetForm()
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    savePost('published')
  }

  const handleSaveDraft = () => {
    if (!formData.title.trim()) {
      alert('Please enter a title before saving draft.')
      return
    }
    savePost('draft')
  }

  const handleEdit = (post) => {
    setFormData(post)
    setView('edit')
  }

  const handleDelete = (id) => {
    if (!window.confirm('Delete this blog post?')) return
    persistPosts(posts.filter((post) => post.id !== id))
  }

  const filteredPosts = posts.filter((post) => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      post.tags.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || post.category === filterCategory
    const matchesStatus = filterStatus === 'all' || post.status === filterStatus
    return matchesSearch && matchesCategory && matchesStatus
  })

  if (view === 'create' || view === 'edit') {
    return (
      <div>
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={resetForm}
            style={{
              padding: '0.5rem 1rem',
              background: 'white',
              color: '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            ← Back to Posts
          </button>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', color: '#111827' }}>
            {view === 'create' ? 'Create New Post' : 'Edit Post'}
          </h1>
        </div>

        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb'
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '1rem',
              marginBottom: '1rem'
            }}>
              {categories.map((cat) => {
                const Icon = cat.icon
                return (
                  <label
                    key={cat.value}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '1rem',
                      border: `2px solid ${formData.category === cat.value ? '#5a4494' : '#e5e7eb'}`,
                      borderRadius: '0.5rem',
                      cursor: 'pointer',
                      background: formData.category === cat.value ? '#5a449408' : 'transparent'
                    }}
                  >
                    <input
                      type='radio'
                      name='category'
                      value={cat.value}
                      checked={formData.category === cat.value}
                      onChange={handleChange}
                      style={{ display: 'none' }}
                    />
                    <Icon size={22} color={formData.category === cat.value ? '#5a4494' : '#6b7280'} />
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: formData.category === cat.value ? '#5a4494' : '#6b7280' }}>
                      {cat.label}
                    </span>
                  </label>
                )
              })}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
              <input
                type='text'
                name='title'
                value={formData.title}
                onChange={handleChange}
                required
                placeholder='Post title'
                style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
                }}
              />
              <input
                type='text'
                name='author'
                value={formData.author}
                onChange={handleChange}
                required
                placeholder='Author'
                style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
                }}
              />
            </div>

            <textarea
              name='excerpt'
              value={formData.excerpt}
              onChange={handleChange}
              rows={2}
              placeholder='Excerpt'
              style={{
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '1rem'
              }}
            />

            <textarea
              name='content'
              value={formData.content}
              onChange={handleChange}
              required
              rows={12}
              placeholder='Write your content here... (Markdown supported)'
              style={{
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                resize: 'vertical',
                fontFamily: 'monospace'
              }}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '3fr 1fr', gap: '1rem' }}>
              <input
                type='text'
                name='tags'
                value={formData.tags}
                onChange={handleChange}
                placeholder='faith, prayer, youth'
                style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
                }}
              />
              <select
                name='status'
                value={formData.status}
                onChange={handleChange}
                style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
                }}
              >
                <option value='published'>Published</option>
                <option value='draft'>Draft</option>
              </select>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: '#374151' }}>
              <input
                type='checkbox'
                name='featured'
                checked={formData.featured}
                onChange={handleChange}
                style={{ width: '18px', height: '18px', cursor: 'pointer' }}
              />
              Feature this post on homepage
            </label>

            <div style={{ display: 'flex', gap: '1rem' }}>
              <button
                type='submit'
                style={{
                  padding: '0.75rem 2rem',
                  background: '#d4a82e',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {view === 'create' ? 'Publish Post' : 'Update Post'}
              </button>
              <button
                type='button'
                onClick={handleSaveDraft}
                style={{
                  padding: '0.75rem 2rem',
                  background: 'white',
                  color: '#6b7280',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Save Draft
              </button>
              <button
                type='button'
                onClick={resetForm}
                style={{
                  padding: '0.75rem 2rem',
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', color: '#111827' }}>
            Blog Management
          </h1>
          <p style={{ margin: 0, color: '#6b7280' }}>
            {posts.length} total posts
          </p>
        </div>
        <button
          onClick={() => setView('create')}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#d4a82e',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          New Post
        </button>
      </div>

      <div style={{
        background: 'white',
        padding: '1.5rem',
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
            <input
              type='text'
              placeholder='Search posts...'
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '0.875rem'
              }}
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem'
            }}
          >
            <option value='all'>All Categories</option>
            <option value='article'>Article</option>
            <option value='devotional'>Devotional</option>
            <option value='sunday-school'>Sunday School</option>
            <option value='testimony'>Testimony</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem'
            }}
          >
            <option value='all'>All Status</option>
            <option value='published'>Published</option>
            <option value='draft'>Draft</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gap: '1rem' }}>
        {filteredPosts.map((post) => {
          const categoryMeta = categories.find((cat) => cat.value === post.category)
          const CategoryIcon = categoryMeta?.icon || FileText

          return (
            <div key={post.id} style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb', padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <CategoryIcon size={16} color='#6b7280' />
                    <span style={{ fontSize: '0.75rem', color: '#6b7280', textTransform: 'capitalize' }}>{post.category}</span>
                    <span style={{ fontSize: '0.75rem', color: post.status === 'published' ? '#065f46' : '#92400e', background: post.status === 'published' ? '#d1fae5' : '#fef3c7', padding: '0.2rem 0.5rem', borderRadius: '999px' }}>
                      {post.status}
                    </span>
                    {post.featured && <Star size={14} color='#d4a82e' fill='#d4a82e' />}
                  </div>
                  <h3 style={{ margin: '0 0 0.35rem', color: '#111827' }}>{post.title}</h3>
                  <p style={{ margin: '0 0 0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>{post.excerpt || 'No excerpt provided.'}</p>
                  <div style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    By {post.author} • {new Date(post.createdAt).toLocaleDateString()} • Tags: {post.tags || 'none'}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', minWidth: '120px' }}>
                  <button
                    onClick={() => handleEdit(post)}
                    style={{
                      padding: '0.5rem',
                      border: 'none',
                      borderRadius: '0.375rem',
                      background: '#f3f4f6',
                      color: '#374151',
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(post.id)}
                    style={{
                      padding: '0.5rem',
                      border: 'none',
                      borderRadius: '0.375rem',
                      background: '#fee2e2',
                      color: '#991b1b',
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filteredPosts.length === 0 && (
        <div style={{
          background: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '2rem',
          textAlign: 'center',
          color: '#9ca3af'
        }}>
          No posts match your filter.
        </div>
      )}
    </div>
  )
}

export default BlogManager
