import { useState } from 'react'
import { Upload, Image as ImageIcon, Video, Headphones } from 'lucide-react'

const MediaManager = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'image',
    mediaCategory: 'worship',
    file: null,
    videoUrl: '',
    speaker: '',
    keypoint: ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    console.log('Media data:', formData)
    // TODO: Upload to backend/cloud storage
    alert('Media uploaded successfully!')
    setFormData({
      title: '',
      description: '',
      category: 'image',
      mediaCategory: 'worship',
      file: null,
      videoUrl: '',
      speaker: '',
      keypoint: ''
    })
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e) => {
    setFormData(prev => ({ ...prev, file: e.target.files[0] }))
  }

  return (
    <div>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', color: '#111827' }}>
          Media Management
        </h1>
        <p style={{ margin: 0, color: '#6b7280' }}>
          Upload images, videos, and audio content
        </p>
      </div>

      <div style={{ 
        background: 'white', 
        padding: '2rem', 
        borderRadius: '0.75rem',
        border: '1px solid #e5e7eb'
      }}>
        <h2 style={{ margin: '0 0 1.5rem', fontSize: '1.5rem', color: '#111827' }}>
          Upload New Media
        </h2>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                Media Type *
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
                }}
              >
                <option value="image">Image</option>
                <option value="video">Video (YouTube URL)</option>
                <option value="audio">Audio</option>
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                Category *
              </label>
              <select
                name="mediaCategory"
                value={formData.mediaCategory}
                onChange={handleChange}
                style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
                }}
              >
                <option value="worship">Worship</option>
                <option value="youth">Youth</option>
                <option value="sermons">Sermons</option>
                <option value="audio">Audio/Music</option>
                <option value="community">Community</option>
                <option value="events">Events</option>
              </select>
            </div>
          </div>

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
              placeholder="e.g., Sunday Worship Session"
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
              Description
            </label>
            <textarea
              name="description"
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
              placeholder="Brief description of the media content..."
            />
          </div>

          {formData.category === 'video' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                YouTube URL *
              </label>
              <input
                type="url"
                name="videoUrl"
                value={formData.videoUrl}
                onChange={handleChange}
                required={formData.category === 'video'}
                style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
                }}
                placeholder="https://www.youtube.com/watch?v=..."
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                {formData.category === 'audio' ? 'Audio File' : 'Image File'} *
              </label>
              <div
                style={{
                  border: '2px dashed #d1d5db',
                  borderRadius: '0.5rem',
                  padding: '2rem',
                  textAlign: 'center',
                  cursor: 'pointer',
                  background: '#f9fafb'
                }}
              >
                <Upload size={32} style={{ margin: '0 auto 1rem', color: '#6b7280' }} />
                <input
                  type="file"
                  accept={formData.category === 'audio' ? 'audio/*' : 'image/*'}
                  onChange={handleFileChange}
                  required={formData.category !== 'video'}
                  style={{ display: 'none' }}
                  id="fileUpload"
                />
                <label htmlFor="fileUpload" style={{ cursor: 'pointer', color: '#5a4494', fontWeight: 600 }}>
                  {formData.file ? formData.file.name : 'Click to upload or drag and drop'}
                </label>
                <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
                  {formData.category === 'audio' ? 'MP3, WAV up to 50MB' : 'JPG, PNG up to 10MB'}
                </p>
              </div>
            </div>
          )}

          {(formData.mediaCategory === 'sermons' || formData.category === 'audio') && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                  Speaker
                </label>
                <input
                  type="text"
                  name="speaker"
                  value={formData.speaker}
                  onChange={handleChange}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                  placeholder="e.g., Rev. David Chibuike"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>
                  Key Point
                </label>
                <input
                  type="text"
                  name="keypoint"
                  value={formData.keypoint}
                  onChange={handleChange}
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                  placeholder="Main takeaway from the sermon/teaching"
                />
              </div>
            </>
          )}

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              type="submit"
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
              Upload Media
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
          Recent Uploads
        </h3>
        <p style={{ margin: 0, color: '#6b7280', fontSize: '0.875rem' }}>
          Media uploads will appear here.
        </p>
      </div>
    </div>
  )
}

export default MediaManager
