import { useState, useEffect } from 'react'
import { Upload, Image as ImageIcon, Video, Headphones, Search, Edit2, Trash2, PlayCircle } from 'lucide-react'

const MediaManager = () => {
  const [view, setView] = useState('list')
  const [mediaItems, setMediaItems] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [formData, setFormData] = useState({
    id: Date.now(),
    title: '',
    description: '',
    category: 'image',
    mediaCategory: 'worship',
    file: null,
    previewUrl: '',
    videoUrl: '',
    speaker: '',
    keypoint: ''
  })

  useEffect(() => {
    const stored = localStorage.getItem('admin_media')
    if (stored) {
      setMediaItems(JSON.parse(stored))
      return
    }

    const demoMedia = [
      {
        id: 1,
        title: 'Sunday Worship Highlights',
        description: 'Powerful moments from last Sunday service.',
        category: 'image',
        mediaCategory: 'worship',
        previewUrl: 'https://images.unsplash.com/photo-1507692049790-de58290a4334?w=800',
        videoUrl: '',
        speaker: '',
        keypoint: '',
        createdAt: new Date().toISOString()
      },
      {
        id: 2,
        title: 'Faith in Action - Sermon',
        description: 'Sunday sermon recording.',
        category: 'video',
        mediaCategory: 'sermons',
        previewUrl: '',
        videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        speaker: 'Rev. David Chibuike',
        keypoint: 'Trust God in every season',
        createdAt: new Date().toISOString()
      }
    ]

    setMediaItems(demoMedia)
    localStorage.setItem('admin_media', JSON.stringify(demoMedia))
  }, [])

  const persistMedia = (updatedMedia) => {
    setMediaItems(updatedMedia)
    localStorage.setItem('admin_media', JSON.stringify(updatedMedia))
  }

  const resetForm = () => {
    setFormData({
      id: Date.now(),
      title: '',
      description: '',
      category: 'image',
      mediaCategory: 'worship',
      file: null,
      previewUrl: '',
      videoUrl: '',
      speaker: '',
      keypoint: ''
    })
    setView('list')
  }

  const handleSubmit = (e) => {
    e.preventDefault()

    const payload = {
      ...formData,
      createdAt: new Date().toISOString()
    }

    if (view === 'create') {
      persistMedia([...mediaItems, { ...payload, id: Date.now() }])
      alert('Media uploaded successfully!')
    } else {
      const updated = mediaItems.map((item) => (item.id === formData.id ? payload : item))
      persistMedia(updated)
      alert('Media updated successfully!')
    }

    resetForm()
  }

  const handleEdit = (item) => {
    setFormData({ ...item, file: null })
    setView('edit')
  }

  const handleDelete = (id) => {
    if (!window.confirm('Delete this media item?')) return
    persistMedia(mediaItems.filter((item) => item.id !== id))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const previewUrl = URL.createObjectURL(file)
    setFormData((prev) => ({
      ...prev,
      file,
      previewUrl
    }))
  }

  const filteredMedia = mediaItems.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || item.category === filterType
    const matchesCategory = filterCategory === 'all' || item.mediaCategory === filterCategory
    return matchesSearch && matchesType && matchesCategory
  })

  const getTypeIcon = (type) => {
    if (type === 'video') return Video
    if (type === 'audio') return Headphones
    return ImageIcon
  }

  const getCardPreview = (item) => {
    if (item.category === 'video') {
      return (
        <div style={{
          height: '180px',
          background: '#111827',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <PlayCircle size={44} />
        </div>
      )
    }

    if (item.previewUrl) {
      return (
        <img
          src={item.previewUrl}
          alt={item.title}
          style={{ width: '100%', height: '180px', objectFit: 'cover' }}
        />
      )
    }

    return (
      <div style={{
        height: '180px',
        background: '#f3f4f6',
        color: '#9ca3af',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <ImageIcon size={44} />
      </div>
    )
  }

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
            ← Back to Media
          </button>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', color: '#111827' }}>
            {view === 'create' ? 'Upload New Media' : 'Edit Media'}
          </h1>
        </div>

        <div style={{
          background: 'white',
          padding: '2rem',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb'
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                  Media Type *
                </label>
                <select
                  name='category'
                  value={formData.category}
                  onChange={handleChange}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                >
                  <option value='image'>Image</option>
                  <option value='video'>Video (YouTube URL)</option>
                  <option value='audio'>Audio</option>
                </select>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                  Category *
                </label>
                <select
                  name='mediaCategory'
                  value={formData.mediaCategory}
                  onChange={handleChange}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                >
                  <option value='worship'>Worship</option>
                  <option value='youth'>Youth</option>
                  <option value='sermons'>Sermons</option>
                  <option value='audio'>Audio/Music</option>
                  <option value='community'>Community</option>
                  <option value='events'>Events</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                Title *
              </label>
              <input
                type='text'
                name='title'
                value={formData.title}
                onChange={handleChange}
                required
                style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
                }}
                placeholder='e.g., Sunday Worship Session'
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                Description
              </label>
              <textarea
                name='description'
                value={formData.description}
                onChange={handleChange}
                rows={3}
                style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  resize: 'vertical'
                }}
              />
            </div>

            {formData.category === 'video' ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                  YouTube URL *
                </label>
                <input
                  type='url'
                  name='videoUrl'
                  value={formData.videoUrl}
                  onChange={handleChange}
                  required
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                />
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                  {formData.category === 'audio' ? 'Audio File' : 'Image File'}
                </label>
                <input
                  type='file'
                  accept={formData.category === 'audio' ? 'audio/*' : 'image/*'}
                  onChange={handleFileChange}
                  style={{ fontSize: '0.875rem' }}
                />
              </div>
            )}

            {(formData.mediaCategory === 'sermons' || formData.category === 'audio') && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <input
                    type='text'
                    name='speaker'
                    value={formData.speaker}
                    onChange={handleChange}
                    placeholder='Speaker'
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem'
                    }}
                  />
                  <input
                    type='text'
                    name='keypoint'
                    value={formData.keypoint}
                    onChange={handleChange}
                    placeholder='Key point'
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem'
                    }}
                  />
                </div>
              </>
            )}

            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                type='submit'
                style={{
                  padding: '0.75rem 2rem',
                  background: '#2d3a7a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <Upload size={18} />
                {view === 'create' ? 'Upload Media' : 'Update Media'}
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
            Media Management
          </h1>
          <p style={{ margin: 0, color: '#6b7280' }}>
            {mediaItems.length} total media items
          </p>
        </div>
        <button
          onClick={() => setView('create')}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#2d3a7a',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Upload size={18} />
          Upload Media
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
              placeholder='Search media...'
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
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            style={{
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem'
            }}
          >
            <option value='all'>All Types</option>
            <option value='image'>Image</option>
            <option value='video'>Video</option>
            <option value='audio'>Audio</option>
          </select>
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
            <option value='worship'>Worship</option>
            <option value='youth'>Youth</option>
            <option value='sermons'>Sermons</option>
            <option value='audio'>Audio/Music</option>
            <option value='community'>Community</option>
            <option value='events'>Events</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
        {filteredMedia.map((item) => {
          const TypeIcon = getTypeIcon(item.category)

          return (
            <div key={item.id} style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}>
              {getCardPreview(item)}
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, color: '#111827', fontSize: '1rem' }}>{item.title}</h3>
                  <TypeIcon size={16} color='#6b7280' />
                </div>
                <p style={{ margin: '0 0 0.75rem', color: '#6b7280', fontSize: '0.875rem' }}>
                  {item.description || 'No description'}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#374151', background: '#f3f4f6', padding: '0.25rem 0.5rem', borderRadius: '0.375rem' }}>
                    {item.mediaCategory}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                    {new Date(item.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    onClick={() => handleEdit(item)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      border: 'none',
                      borderRadius: '0.375rem',
                      background: '#f3f4f6',
                      color: '#374151',
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <Edit2 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    style={{
                      flex: 1,
                      padding: '0.5rem',
                      border: 'none',
                      borderRadius: '0.375rem',
                      background: '#fee2e2',
                      color: '#991b1b',
                      cursor: 'pointer',
                      fontWeight: 600,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
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

      {filteredMedia.length === 0 && (
        <div style={{
          background: 'white',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          padding: '2rem',
          textAlign: 'center',
          color: '#9ca3af'
        }}>
          No media items match your filter.
        </div>
      )}
    </div>
  )
}

export default MediaManager
