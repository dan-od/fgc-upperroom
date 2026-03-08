import { useState } from 'react'
import { FileText, BookOpen, Heart, GraduationCap } from 'lucide-react'

const BlogManager = () => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'article',
    author: '',
    excerpt: '',
    tags: '',
    featured: false
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Blog post data:', formData)
    // TODO: Send to backend API
    alert('Blog post created successfully!')
    setFormData({
      title: '',
      content: '',
      category: 'article',
      author: '',
      excerpt: '',
      tags: '',
      featured: false
    })
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const categories = [
    { value: 'article', label: 'Article', icon: FileText },
    { value: 'devotional', label: 'Devotional', icon: Heart },
    { value: 'sunday-school', label: 'Sunday School', icon: GraduationCap },
    { value: 'testimony', label: 'Testimony', icon: BookOpen }
  ]

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', color: '#111827' }}>
          Blog Management
        </h1>
        <p style={{ margin: 0, color: '#6b7280' }}>
          Create articles, devotionals, and Sunday school materials
        </p>
      </div>

      <div style={{ 
        background: 'white', 
        padding: '2rem', 
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', color: '#111827' }}>
          Create New Post
        </h2>
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
                    background: formData.category === cat.value ? '#5a449408' : 'transparent',
                    transition: 'all 0.15s'
                  }}
                >
                  <input
                    type="radio"
                    name="category"
                    value={cat.value}
                    checked={formData.category === cat.value}
                    onChange={handleChange}
                    style={{ display: 'none' }}
                  />
                  <Icon size={24} color={formData.category === cat.value ? '#5a4494' : '#6b7280'} />
                  <span style={{ 
                    fontSize: '0.875rem', 
                    fontWeight: 600,
                    color: formData.category === cat.value ? '#5a4494' : '#6b7280'
                  }}>
                    {cat.label}
                  </span>
                </label>
              )
            })}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                required
                style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
                }}
                placeholder="Enter post title..."
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                Author *
              </label>
              <input
                type="text"
                name="author"
                value={formData.author}
                onChange={handleChange}
                required
                style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
                }}
                placeholder="Author name"
              />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
              Excerpt
            </label>
            <textarea
              name="excerpt"
              value={formData.excerpt}
              onChange={handleChange}
              rows={2}
              style={{
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                resize: 'vertical'
              }}
              placeholder="Brief summary for preview (optional)"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
              Content *
            </label>
            <textarea
              name="content"
              value={formData.content}
              onChange={handleChange}
              required
              rows={12}
              style={{
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                resize: 'vertical',
                fontFamily: 'monospace'
              }}
              placeholder="Write your content here... (Supports Markdown)"
            />
            <p style={{ margin: '0.5rem 0 0', fontSize: '0.75rem', color: '#6b7280' }}>
              Tip: Use Markdown for formatting (##heading, **bold**, *italic*, - list)
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
              Tags
            </label>
            <input
              type="text"
              name="tags"
              value={formData.tags}
              onChange={handleChange}
              style={{
                padding: '0.75rem',
                border: '1px solid #d1d5db',
                borderRadius: '0.5rem',
                fontSize: '1rem'
              }}
              placeholder="faith, prayer, youth (comma-separated)"
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <input
              type="checkbox"
              id="featured"
              name="featured"
              checked={formData.featured}
              onChange={handleChange}
              style={{ width: '18px', height: '18px', cursor: 'pointer' }}
            />
            <label htmlFor="featured" style={{ fontSize: '0.875rem', color: '#374151', cursor: 'pointer' }}>
              Feature this post on homepage
            </label>
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              type="submit"
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
              Publish Post
            </button>
            <button
              type="button"
              style={{
                padding: '0.75rem 2rem',
                background: 'transparent',
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
          </div>
        </form>
      </div>

      <div style={{ 
        marginTop: '2rem',
        background: 'white', 
        padding: '1.5rem', 
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb'
      }}>
        <h3 style={{ margin: '0 0 1rem', fontSize: '1.125rem', color: '#111827' }}>
          Recent Posts
        </h3>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
          Published posts will appear here.
        </p>
      </div>
    </div>
  )
}

export default BlogManager
