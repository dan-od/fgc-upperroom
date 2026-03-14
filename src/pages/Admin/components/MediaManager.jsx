import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Camera,
  Edit2,
  Headphones,
  Image as ImageIcon,
  Link2,
  PlayCircle,
  Plus,
  Search,
  Trash2,
  Upload,
  Video,
  X
} from 'lucide-react'
import {
  DEFAULT_MEDIA_THUMBNAIL,
  MEDIA_CATEGORIES,
  extractYouTubeId,
  normalizeAdminMediaItem,
  normalizeTitleKey,
  readAdminMediaItems,
  toYouTubeEmbedUrl,
  writeAdminMediaItems
} from '../../../utils/mediaStorage'

const createEmptyForm = () => ({
  id: '',
  title: '',
  description: '',
  mediaCategory: 'worship',
  speaker: '',
  keypoint: '',
  syncKey: '',
  youtubeUrlInput: '',
  media: []
})

const fileToDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`))
    reader.readAsDataURL(file)
  })
}

const toAssetFromFile = async (file) => {
  const dataUrl = await fileToDataUrl(file)

  if (file.type.startsWith('video/')) {
    return {
      id: `asset-${Date.now()}-${file.name}`,
      type: 'video',
      src: String(dataUrl),
      thumbnail: DEFAULT_MEDIA_THUMBNAIL,
      alt: file.name,
      name: file.name,
      mimeType: file.type
    }
  }

  if (file.type.startsWith('audio/')) {
    return {
      id: `asset-${Date.now()}-${file.name}`,
      type: 'audio',
      audioUrl: String(dataUrl),
      src: '',
      thumbnail: DEFAULT_MEDIA_THUMBNAIL,
      alt: file.name,
      name: file.name,
      mimeType: file.type
    }
  }

  return {
    id: `asset-${Date.now()}-${file.name}`,
    type: 'image',
    src: String(dataUrl),
    thumbnail: String(dataUrl),
    alt: file.name,
    name: file.name,
    mimeType: file.type
  }
}

const MediaManager = () => {
  const [view, setView] = useState('list')
  const [mediaItems, setMediaItems] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [formData, setFormData] = useState(createEmptyForm)
  const [notice, setNotice] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    setMediaItems(readAdminMediaItems())
  }, [])

  const persistMedia = (updatedMedia) => {
    writeAdminMediaItems(updatedMedia)
    setMediaItems(readAdminMediaItems())
  }

  const resetForm = () => {
    setFormData(createEmptyForm())
    setNotice(null)
    setView('list')
  }

  const openCreate = () => {
    setFormData(createEmptyForm())
    setNotice(null)
    setView('create')
  }

  const handleEdit = (item) => {
    setFormData({
      id: item.id,
      title: item.title,
      description: item.description || '',
      mediaCategory: item.category || item.mediaCategory || 'worship',
      speaker: item.speaker || '',
      keypoint: item.keypoint || '',
      syncKey: item.syncKey || item.mergeKey || normalizeTitleKey(item.title),
      youtubeUrlInput: '',
      media: Array.isArray(item.media) ? item.media : []
    })
    setNotice(null)
    setView('edit')
  }

  const handleDelete = (id) => {
    if (!window.confirm('Delete this media item?')) {
      return
    }

    persistMedia(mediaItems.filter((item) => item.id !== id))
    setNotice({ tone: 'success', text: 'Media item deleted.' })
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handlePickMedia = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''

    if (!files.length) {
      return
    }

    const allowedFiles = files.filter((file) => {
      return file.type.startsWith('image/') || file.type.startsWith('video/') || file.type.startsWith('audio/')
    })

    if (!allowedFiles.length) {
      setNotice({ tone: 'error', text: 'Select image, video, or audio files only.' })
      return
    }

    const oversized = allowedFiles.find((file) => file.size > 20 * 1024 * 1024)
    if (oversized) {
      setNotice({ tone: 'error', text: `${oversized.name} is above 20MB. Please upload a smaller file.` })
      return
    }

    try {
      setIsUploading(true)
      const assets = await Promise.all(allowedFiles.map((file) => toAssetFromFile(file)))
      setFormData((prev) => ({
        ...prev,
        media: [...prev.media, ...assets]
      }))
      setNotice({ tone: 'success', text: `${assets.length} media file${assets.length > 1 ? 's' : ''} added.` })
    } catch {
      setNotice({ tone: 'error', text: 'Unable to process the selected files. Please retry.' })
    } finally {
      setIsUploading(false)
    }
  }

  const removeAsset = (assetId) => {
    setFormData((prev) => ({
      ...prev,
      media: prev.media.filter((asset) => asset.id !== assetId)
    }))
  }

  const handleAddYouTubeVideo = () => {
    const rawUrl = String(formData.youtubeUrlInput || '').trim()
    const videoId = extractYouTubeId(rawUrl)

    if (!videoId) {
      setNotice({ tone: 'error', text: 'Enter a valid YouTube URL.' })
      return
    }

    const embedUrl = toYouTubeEmbedUrl(rawUrl)
    const alreadyAdded = formData.media.some((asset) => asset.videoUrl === embedUrl)

    if (alreadyAdded) {
      setNotice({ tone: 'error', text: 'This YouTube video is already attached.' })
      return
    }

    setFormData((prev) => ({
      ...prev,
      youtubeUrlInput: '',
      media: [
        ...prev.media,
        {
          id: `asset-youtube-${videoId}-${Date.now()}`,
          type: 'video',
          videoUrl: embedUrl,
          src: '',
          thumbnail: DEFAULT_MEDIA_THUMBNAIL,
          alt: prev.title || 'Sermon video'
        }
      ]
    }))
    setNotice({ tone: 'success', text: 'YouTube video attached.' })
  }

  const handleSubmit = (event) => {
    event.preventDefault()

    const title = String(formData.title || '').trim()
    if (!title) {
      setNotice({ tone: 'error', text: 'Title is required.' })
      return
    }

    if (!formData.media.length) {
      setNotice({ tone: 'error', text: 'Add at least one image or video for this upload.' })
      return
    }

    if (formData.mediaCategory === 'sermons' && !String(formData.speaker || '').trim()) {
      setNotice({ tone: 'error', text: 'Speaker name is required for sermon uploads.' })
      return
    }

    const nowIso = new Date().toISOString()
    const existing = mediaItems.find((item) => item.id === formData.id)
    const mergeKey = normalizeTitleKey(formData.syncKey || title)

    const payload = normalizeAdminMediaItem({
      id: existing?.id || `admin-media-${Date.now()}`,
      title,
      description: String(formData.description || '').trim(),
      category: formData.mediaCategory,
      mediaCategory: formData.mediaCategory,
      speaker: String(formData.speaker || '').trim(),
      keypoint: String(formData.keypoint || '').trim(),
      syncKey: String(formData.syncKey || '').trim(),
      mergeKey,
      media: formData.media,
      timestamp: existing?.timestamp || Date.now(),
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso
    })

    if (view === 'create') {
      persistMedia([payload, ...mediaItems])
      setNotice({ tone: 'success', text: 'Media uploaded successfully.' })
    } else {
      const updated = mediaItems.map((item) => (item.id === payload.id ? payload : item))
      persistMedia(updated)
      setNotice({ tone: 'success', text: 'Media updated successfully.' })
    }

    setView('list')
    setFormData(createEmptyForm())
  }

  const filteredMedia = useMemo(() => {
    return mediaItems.filter((item) => {
      const term = searchTerm.toLowerCase().trim()
      const inText =
        !term ||
        item.title.toLowerCase().includes(term) ||
        String(item.description || '').toLowerCase().includes(term) ||
        String(item.speaker || '').toLowerCase().includes(term)

      const inType =
        filterType === 'all' ||
        item.type === filterType ||
        (Array.isArray(item.media) && item.media.some((asset) => asset.type === filterType))

      const inCategory = filterCategory === 'all' || item.category === filterCategory

      return inText && inType && inCategory
    })
  }, [mediaItems, searchTerm, filterType, filterCategory])

  const getTypeIcon = (type) => {
    if (type === 'video') {
      return Video
    }

    if (type === 'audio') {
      return Headphones
    }

    return ImageIcon
  }

  const getCardPreview = (item) => {
    const firstAsset = Array.isArray(item.media) ? item.media[0] : null

    if (firstAsset?.type === 'image' && firstAsset.src) {
      return (
        <img
          src={firstAsset.src}
          alt={firstAsset.alt || item.title}
          style={{ width: '100%', height: '180px', objectFit: 'cover' }}
        />
      )
    }

    if (firstAsset?.type === 'video') {
      return (
        <div style={{ position: 'relative', height: '180px', background: '#111827' }}>
          <img
            src={firstAsset.thumbnail || item.thumbnail || DEFAULT_MEDIA_THUMBNAIL}
            alt={item.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', opacity: 0.65 }}
          />
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', color: '#fff' }}>
            <PlayCircle size={42} />
          </div>
        </div>
      )
    }

    if (firstAsset?.type === 'audio') {
      return (
        <div
          style={{
            height: '180px',
            background: '#111827',
            color: 'white',
            display: 'grid',
            placeItems: 'center'
          }}
        >
          <Headphones size={42} />
        </div>
      )
    }

    return (
      <div
        style={{
          height: '180px',
          background: '#f3f4f6',
          color: '#9ca3af',
          display: 'grid',
          placeItems: 'center'
        }}
      >
        <ImageIcon size={44} />
      </div>
    )
  }

  const renderNotice = () => {
    if (!notice) {
      return null
    }

    return (
      <div
        style={{
          marginBottom: '1rem',
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          background: notice.tone === 'error' ? '#fee2e2' : '#dcfce7',
          color: notice.tone === 'error' ? '#991b1b' : '#166534',
          border: `1px solid ${notice.tone === 'error' ? '#fecaca' : '#86efac'}`,
          fontSize: '0.875rem',
          fontWeight: 600
        }}
      >
        {notice.text}
      </div>
    )
  }

  if (view === 'create' || view === 'edit') {
    return (
      <div>
        <div style={{ marginBottom: '1.5rem' }}>
          <button
            type="button"
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
          <p style={{ margin: 0, color: '#6b7280' }}>
            Upload multiple images and/or videos in one entry. No scheduling is required.
          </p>
        </div>

        {renderNotice()}

        <div
          style={{
            background: 'white',
            padding: '2rem',
            borderRadius: '0.75rem',
            border: '1px solid #e5e7eb'
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Title *</span>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Sunday Worship Session"
                  style={{
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Category *</span>
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
                  {MEDIA_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#374151' }}>Description</span>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Add context for this media set"
                style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  resize: 'vertical'
                }}
              />
            </label>

            <div
              style={{
                border: '1px dashed #9ca3af',
                borderRadius: '0.75rem',
                padding: '1rem',
                background: '#f8fafc'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,video/*,audio/*"
                multiple
                onChange={handleFileChange}
                style={{ display: 'none' }}
              />
              <button
                type="button"
                onClick={handlePickMedia}
                disabled={isUploading}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  borderRadius: '0.5rem',
                  border: '1px solid #2d3a7a',
                  background: '#2d3a7a',
                  color: 'white',
                  padding: '0.65rem 1rem',
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                <Camera size={18} />
                {isUploading ? 'Processing files...' : 'Select Media Files'}
              </button>
              <p style={{ margin: '0.6rem 0 0', color: '#6b7280', fontSize: '0.825rem' }}>
                Upload multiple images and videos with one click (max 20MB per file).
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem' }}>
              <input
                type="url"
                name="youtubeUrlInput"
                value={formData.youtubeUrlInput}
                onChange={handleChange}
                placeholder="Optional YouTube URL (attach sermon video)"
                style={{
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
                }}
              />
              <button
                type="button"
                onClick={handleAddYouTubeVideo}
                style={{
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1rem',
                  background: 'white',
                  color: '#374151',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <Link2 size={16} />
                Attach URL
              </button>
            </div>

            {formData.mediaCategory === 'sermons' && (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <input
                    type="text"
                    name="speaker"
                    value={formData.speaker}
                    onChange={handleChange}
                    placeholder="Speaker *"
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem'
                    }}
                  />
                  <input
                    type="text"
                    name="keypoint"
                    value={formData.keypoint}
                    onChange={handleChange}
                    placeholder="Key point"
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem'
                    }}
                  />
                </div>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#374151' }}>
                    Sermon Sync Key (optional)
                  </span>
                  <input
                    type="text"
                    name="syncKey"
                    value={formData.syncKey}
                    onChange={handleChange}
                    placeholder="If empty, title will be used to merge with YouTube sermons"
                    style={{
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '1rem'
                    }}
                  />
                </label>
              </>
            )}

            <div>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: '#374151', fontWeight: 600 }}>
                Attached Assets ({formData.media.length})
              </p>
              {formData.media.length === 0 ? (
                <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.825rem' }}>
                  No media files attached yet.
                </p>
              ) : (
                <div style={{ display: 'grid', gap: '0.5rem' }}>
                  {formData.media.map((asset) => {
                    const AssetIcon = getTypeIcon(asset.type)
                    return (
                      <div
                        key={asset.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.75rem',
                          border: '1px solid #e5e7eb',
                          borderRadius: '0.5rem',
                          padding: '0.5rem 0.75rem',
                          background: 'white'
                        }}
                      >
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem', color: '#374151' }}>
                          <AssetIcon size={15} />
                          <span style={{ fontSize: '0.85rem' }}>{asset.name || asset.alt || asset.type}</span>
                        </span>
                        <button
                          type="button"
                          onClick={() => removeAsset(asset.id)}
                          style={{
                            border: 'none',
                            background: 'transparent',
                            color: '#991b1b',
                            display: 'inline-flex',
                            alignItems: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <X size={15} />
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="submit"
                style={{
                  padding: '0.75rem 1.3rem',
                  background: '#2d3a7a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}
              >
                <Upload size={16} />
                {view === 'create' ? 'Save Media Upload' : 'Update Media Upload'}
              </button>

              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: '0.75rem 1.3rem',
                  background: 'white',
                  color: '#374151',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
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
      {renderNotice()}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', color: '#111827' }}>Media Management</h1>
          <p style={{ margin: 0, color: '#6b7280' }}>{mediaItems.length} total media uploads</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          style={{
            padding: '0.75rem 1.2rem',
            background: '#2d3a7a',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Plus size={18} />
          New Media Upload
        </button>
      </div>

      <div
        style={{
          background: 'white',
          padding: '1rem',
          borderRadius: '0.75rem',
          border: '1px solid #e5e7eb',
          marginBottom: '1rem'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '0.75rem' }}>
          <div style={{ position: 'relative' }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}
            />
            <input
              type="text"
              placeholder="Search title, description, speaker..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
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
            onChange={(event) => setFilterType(event.target.value)}
            style={{
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem'
            }}
          >
            <option value="all">All Types</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
          </select>

          <select
            value={filterCategory}
            onChange={(event) => setFilterCategory(event.target.value)}
            style={{
              padding: '0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              fontSize: '0.875rem'
            }}
          >
            <option value="all">All Categories</option>
            {MEDIA_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {filteredMedia.map((item) => {
          const TypeIcon = getTypeIcon(item.type)
          const assetCount = Array.isArray(item.media) ? item.media.length : 0

          return (
            <div
              key={item.id}
              style={{ background: 'white', borderRadius: '0.75rem', border: '1px solid #e5e7eb', overflow: 'hidden' }}
            >
              {getCardPreview(item)}
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, color: '#111827', fontSize: '1rem' }}>{item.title}</h3>
                  <TypeIcon size={16} color="#6b7280" />
                </div>

                <p style={{ margin: '0 0 0.5rem', color: '#6b7280', fontSize: '0.875rem' }}>
                  {item.description || 'No description'}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: '#374151',
                      background: '#f3f4f6',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.375rem'
                    }}
                  >
                    {item.category}
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: '#374151',
                      background: '#eef2ff',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.375rem'
                    }}
                  >
                    {assetCount} asset{assetCount === 1 ? '' : 's'}
                  </span>
                </div>

                {item.speaker && (
                  <p style={{ margin: '0 0 0.65rem', color: '#4b5563', fontSize: '0.8rem', fontWeight: 600 }}>
                    Speaker: {item.speaker}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    type="button"
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
                    type="button"
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
        <div
          style={{
            background: 'white',
            borderRadius: '0.75rem',
            border: '1px solid #e5e7eb',
            padding: '2rem',
            textAlign: 'center',
            color: '#9ca3af'
          }}
        >
          No media items match your filters.
        </div>
      )}
    </div>
  )
}

export default MediaManager
