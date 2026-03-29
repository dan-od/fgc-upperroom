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
  approveAdminMediaItem,
  DEFAULT_MEDIA_THUMBNAIL,
  MEDIA_CATEGORIES,
  extractYouTubeId,
  normalizeAdminMediaItem,
  normalizeTitleKey,
  readAdminMediaItems,
  toYouTubeEmbedUrl,
  uploadAdminMediaFiles,
  writeAdminMediaItems
} from '../../../utils/mediaStorage'
import { DropdownSelect } from '../../../components/common'
import { ADMIN_DATE_FILTER_OPTIONS, matchesAdminDateFilter } from '../../../utils/adminDateFilters'
import { recordAdminAudit } from '../../../utils/adminApi'
import { useAdminTheme } from '../AdminThemeContext'
import AdminModal from './AdminModal'

const createEmptyForm = () => ({
  id: '',
  title: '',
  description: '',
  mediaCategory: 'worship',
  speaker: '',
  keypoint: '',
  syncKey: '',
  youtubeUrlInput: '',
  status: 'pending_review',
  media: []
})

const MediaManager = ({ currentUser = null, hasPermission = () => false }) => {
  const { darkMode } = useAdminTheme()
  const ui = {
    panel: darkMode ? '#1a2235' : 'white',
    panelAlt: darkMode ? '#131b2e' : '#f8fafc',
    panelSubtle: darkMode ? '#222c40' : '#f3f4f6',
    border: darkMode ? '#2a3550' : '#e5e7eb',
    borderSoft: darkMode ? '#3a4866' : '#d1d5db',
    textPrimary: darkMode ? '#e2e8f0' : '#111827',
    textSecondary: darkMode ? '#94afd4' : '#6b7280',
    textMuted: darkMode ? '#c3d4ef' : '#374151',
    textFaint: darkMode ? '#7f93b3' : '#9ca3af'
  }
  const [view, setView] = useState('list')
  const [mediaItems, setMediaItems] = useState([])
  const [selectedMedia, setSelectedMedia] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterDate, setFilterDate] = useState('all')
  const [formData, setFormData] = useState(createEmptyForm)
  const [notice, setNotice] = useState(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef(null)
  const canWrite = hasPermission('content:media:write')
  const canApprove = hasPermission('content:media:approve')
  const audit = (action, details = {}) => {
    recordAdminAudit({ action, resource: 'content.media', details }).catch(() => {})
  }

  // Modal system for confirmation and prompts
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    tone: 'info',
    onConfirm: null,
    showInput: false,
    inputValue: '',
    inputPlaceholder: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel'
  })

  const closeModal = () => setModalConfig((prev) => ({ ...prev, isOpen: false }))
  const openModal = (config) => setModalConfig({
    isOpen: true,
    title: config.title || 'Are you sure?',
    message: config.message || '',
    tone: config.tone || 'info',
    onConfirm: config.onConfirm || null,
    showInput: !!config.showInput,
    inputValue: config.initialValue || '',
    inputPlaceholder: config.inputPlaceholder || '',
    confirmLabel: config.confirmLabel || 'Confirm',
    cancelLabel: config.cancelLabel || 'Cancel'
  })

  const handleModalConfirm = () => {
    if (modalConfig.onConfirm) {
      modalConfig.onConfirm(modalConfig.inputValue)
    }
    closeModal()
  }

  useEffect(() => {
    const hydrate = async () => {
      const items = await readAdminMediaItems()
      setMediaItems(items)
    }

    hydrate()
  }, [])

  useEffect(() => {
    const validIds = new Set(mediaItems.map((item) => String(item.id)))
    setSelectedMedia((prev) => prev.filter((id) => validIds.has(String(id))))
  }, [mediaItems])

  const persistMedia = async (updatedMedia) => {
    try {
      await writeAdminMediaItems(updatedMedia)
      const latest = await readAdminMediaItems()
      setMediaItems(latest)
      return true
    } catch (err) {
      setNotice({ tone: 'error', text: err.message || 'Failed to save. Please try again.' })
      return false
    }
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

  const handleDelete = async (id) => {
    if (!canWrite) {
      setNotice({ tone: 'error', text: 'Your role cannot delete media items.' })
      return
    }

    const selected = mediaItems.find((item) => item.id === id)
    const confirmMessage = selected
      ? `Delete "${selected.title}"? This cannot be undone.`
      : 'Delete this media item? This cannot be undone.'

    openModal({
      title: 'Delete Media Item',
      message: confirmMessage,
      tone: 'danger',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        const saved = await persistMedia(mediaItems.filter((item) => item.id !== id))
        if (!saved) return
        setNotice({ tone: 'success', text: 'Media item deleted.' })
        audit('media.delete', { id })
      }
    })
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

    const SAFE_TOTAL_BYTES = 200 * 1024 * 1024
    const existingSize = formData.media.reduce((sum, asset) => {
      return sum + Number(asset.fileSize || 0)
    }, 0)
    const incomingSize = allowedFiles.reduce((sum, f) => sum + f.size, 0)
    if (existingSize + incomingSize > SAFE_TOTAL_BYTES) {
      setNotice({
        tone: 'error',
        text: 'Total file size for this item exceeds 200MB. Upload fewer or smaller files, or use YouTube links for videos.'
      })
      return
    }

    try {
      setIsUploading(true)
      const assets = await uploadAdminMediaFiles(allowedFiles)
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

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canWrite) {
      setNotice({ tone: 'error', text: 'Your role cannot modify media items.' })
      return
    }

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
    // Editors submit for review; super_admin/reviewers publish directly
    const targetStatus = canApprove ? 'published' : 'pending_review'

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
      status: existing?.status === 'published' ? 'published' : targetStatus,
      publishedAt: targetStatus === 'published' ? nowIso : existing?.publishedAt || null,
      media: formData.media,
      timestamp: existing?.timestamp || Date.now(),
      createdAt: existing?.createdAt || nowIso,
      updatedAt: nowIso
    })

    if (view === 'create') {
      const saved = await persistMedia([payload, ...mediaItems])
      if (!saved) return
      setNotice({ tone: 'success', text: canApprove ? 'Media published.' : 'Media submitted for review.' })
      audit('media.create', { id: payload.id, category: payload.category, assets: payload.media.length, status: payload.status })
    } else {
      const updated = mediaItems.map((item) => (item.id === payload.id ? payload : item))
      const saved = await persistMedia(updated)
      if (!saved) return
      setNotice({ tone: 'success', text: canApprove ? 'Media published.' : 'Media updated and submitted for review.' })
      audit('media.update', { id: payload.id, category: payload.category, assets: payload.media.length, status: payload.status })
    }

    setView('list')
    setFormData(createEmptyForm())
  }

  const handleApprove = async (item) => {
    if (!canApprove) {
      setNotice({ tone: 'error', text: 'Your role cannot approve media.' })
      return
    }

    try {
      await approveAdminMediaItem(item.id)
      const latest = await readAdminMediaItems()
      setMediaItems(latest)
      setNotice({ tone: 'success', text: `"${item.title}" approved and published.` })
      audit('media.approve_and_publish', { id: item.id })
    } catch (error) {
      setNotice({ tone: 'error', text: error?.message || 'Unable to approve media right now.' })
    }
  }

  const handleSubmitForReview = async (item) => {
    if (!canWrite) {
      setNotice({ tone: 'error', text: 'Your role cannot submit media for review.' })
      return
    }
    const nowIso = new Date().toISOString()
    const updated = mediaItems.map((m) => {
      if (m.id !== item.id) return m
      return { ...m, status: 'pending_review', updatedAt: nowIso }
    })
    const saved = await persistMedia(updated)
    if (!saved) return
    setNotice({ tone: 'success', text: 'Media submitted for review.' })
    audit('media.submit_review', { id: item.id })
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
      const matchesDate = matchesAdminDateFilter(item.publishedAt || item.updatedAt || item.createdAt || item.date, filterDate)

      return inText && inType && inCategory && matchesDate
    })
  }, [mediaItems, searchTerm, filterType, filterCategory, filterDate])

  const handleSelectMediaItem = (id) => {
    setSelectedMedia((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ))
  }

  const handleSelectAllMedia = (checked) => {
    if (!checked) {
      setSelectedMedia([])
      return
    }
    setSelectedMedia(filteredMedia.map((item) => String(item.id)))
  }

  const handleBulkMediaAction = async (action) => {
    if (!selectedMedia.length) return
    if (!canWrite) {
      setNotice({ tone: 'error', text: 'Your role cannot run bulk media actions.' })
      return
    }

    const selectedSet = new Set(selectedMedia.map(String))
    if (action === 'delete') {
      openModal({
        title: 'Bulk Delete',
        message: `Delete ${selectedMedia.length} selected media item(s)? This action cannot be undone.`,
        tone: 'danger',
        confirmLabel: 'Delete All',
        onConfirm: async () => {
          const updated = mediaItems.filter((item) => !selectedSet.has(String(item.id)))
          const saved = await persistMedia(updated)
          if (!saved) return
          setSelectedMedia([])
          setNotice({ tone: 'success', text: 'Selected media items deleted.' })
          audit('media.bulk_delete', { count: selectedMedia.length })
        }
      })
      return
    }

    if (action === 'category') {
      openModal({
        title: 'Batch Category',
        message: 'Enter the category for these items (e.g., sermons, worship, youth).',
        showInput: true,
        inputPlaceholder: 'Category name...',
        onConfirm: async (input) => {
          if (!input) return
          const normalizedCategory = String(input).trim().toLowerCase()
          const updated = mediaItems.map((item) => {
            if (!selectedSet.has(String(item.id))) return item
            return {
              ...item,
              category: normalizedCategory,
              mediaCategory: normalizedCategory,
              updatedAt: new Date().toISOString()
            }
          })
          const saved = await persistMedia(updated)
          if (!saved) return
          setSelectedMedia([])
          setNotice({ tone: 'success', text: 'Selected media category updated.' })
          audit('media.bulk_category', { count: selectedMedia.length, category: normalizedCategory })
        }
      })
    }
  }

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
          background: ui.panelSubtle,
          color: ui.textFaint,
          display: 'grid',
          placeItems: 'center'
        }}
      >
        <ImageIcon size={44} />
      </div>
    )
  }

  const formatStamp = (value) => {
    if (!value) {
      return 'Not updated yet'
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return 'Unknown'
    }

    return date.toLocaleString()
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
              background: ui.panel,
              color: ui.textMuted,
              border: `1px solid ${ui.borderSoft}`,
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            ← Back to Media
          </button>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', color: ui.textPrimary }}>
            {view === 'create' ? 'Upload New Media' : 'Edit Media'}
          </h1>
          <p style={{ margin: 0, color: ui.textSecondary }}>
            Upload multiple images and/or videos in one entry. No scheduling is required.
          </p>
        </div>

        {renderNotice()}

        <div
          style={{
            background: ui.panel,
            padding: '2rem',
            borderRadius: '0.75rem',
            border: `1px solid ${ui.border}`
          }}
        >
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: ui.textMuted }}>Title *</span>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  placeholder="e.g., Sunday Worship Session"
                  style={{
                    padding: '0.75rem',
                    border: `1px solid ${ui.borderSoft}`,
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                />
              </label>

              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: ui.textMuted }}>Category *</span>
                <DropdownSelect
                  name="mediaCategory"
                  value={formData.mediaCategory}
                  onChange={handleChange}
                  style={{
                    padding: '0.75rem',
                    border: `1px solid ${ui.borderSoft}`,
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                >
                  {MEDIA_CATEGORIES.map((category) => (
                    <option key={category.value} value={category.value}>
                      {category.label}
                    </option>
                  ))}
                </DropdownSelect>
              </label>
            </div>

            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: ui.textMuted }}>Description</span>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                placeholder="Add context for this media set"
                style={{
                  padding: '0.75rem',
                  border: `1px solid ${ui.borderSoft}`,
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  resize: 'vertical'
                }}
              />
            </label>

            <div
              style={{
                border: `1px dashed ${ui.textFaint}`,
                borderRadius: '0.75rem',
                padding: '1rem',
                background: ui.panelAlt
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
              <p style={{ margin: '0.6rem 0 0', color: ui.textSecondary, fontSize: '0.825rem' }}>
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
                  border: `1px solid ${ui.borderSoft}`,
                  borderRadius: '0.5rem',
                  fontSize: '1rem'
                }}
              />
              <button
                type="button"
                onClick={handleAddYouTubeVideo}
                style={{
                  border: `1px solid ${ui.borderSoft}`,
                  borderRadius: '0.5rem',
                  padding: '0.75rem 1rem',
                  background: ui.panel,
                  color: ui.textMuted,
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

            {formData.mediaCategory !== 'events' && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <input
                  type="text"
                  name="speaker"
                  value={formData.speaker}
                  onChange={handleChange}
                  placeholder={formData.mediaCategory === 'sermons' ? 'Speaker *' : 'Speaker (optional)'}
                  style={{
                    padding: '0.75rem',
                    border: `1px solid ${ui.borderSoft}`,
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                />
                <input
                  type="text"
                  name="keypoint"
                  value={formData.keypoint}
                  onChange={handleChange}
                  placeholder="Key point (optional)"
                  style={{
                    padding: '0.75rem',
                    border: `1px solid ${ui.borderSoft}`,
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                />
              </div>
            )}

            {formData.mediaCategory === 'sermons' && (
              <label style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: ui.textMuted }}>
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
                    border: `1px solid ${ui.borderSoft}`,
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                />
              </label>
            )}

            <div>
              <p style={{ margin: '0 0 0.5rem', fontSize: '0.85rem', color: ui.textMuted, fontWeight: 600 }}>
                Attached Assets ({formData.media.length})
              </p>
              {formData.media.length === 0 ? (
                <p style={{ margin: 0, color: ui.textFaint, fontSize: '0.825rem' }}>
                  No media files attached yet.
                </p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {formData.media.map((asset) => {
                    const AssetIcon = getTypeIcon(asset.type)
                    const preview = asset.type === 'image'
                      ? (asset.src || asset.thumbnail)
                      : asset.type === 'video'
                        ? (asset.thumbnail || null)
                        : null
                    return (
                      <div
                        key={asset.id}
                        style={{
                          position: 'relative',
                          border: `1px solid ${ui.border}`,
                          borderRadius: '0.5rem',
                          overflow: 'hidden',
                          background: ui.panelAlt
                        }}
                      >
                        {preview ? (
                          <img
                            src={preview}
                            alt={asset.alt || asset.name || asset.type}
                            style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            aspectRatio: '1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: ui.textFaint,
                            background: ui.panelSubtle
                          }}>
                            <AssetIcon size={28} />
                          </div>
                        )}
                        <div style={{
                          padding: '0.35rem 0.5rem',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.25rem',
                          background: ui.panel,
                          borderTop: `1px solid ${ui.border}`
                        }}>
                          <span style={{
                            fontSize: '0.75rem',
                            color: ui.textMuted,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            minWidth: 0
                          }}>
                            {asset.name || asset.alt || asset.type}
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
                              flexShrink: 0,
                              cursor: 'pointer',
                              padding: 0
                            }}
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button
                type="submit"
                disabled={!canWrite}
                style={{
                  padding: '0.75rem 1.3rem',
                  background: '#2d3a7a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '0.95rem',
                  fontWeight: 700,
                  cursor: canWrite ? 'pointer' : 'not-allowed',
                  opacity: canWrite ? 1 : 0.65,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem'
                }}
              >
                <Upload size={16} />
                {view === 'create' ? 'Upload to Media' : 'Update Media Item'}
              </button>

              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: '0.75rem 1.3rem',
                  background: ui.panel,
                  color: ui.textMuted,
                  border: `1px solid ${ui.borderSoft}`,
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
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', color: ui.textPrimary }}>Media Management</h1>
          <p style={{ margin: 0, color: ui.textSecondary }}>{mediaItems.length} total media uploads</p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          disabled={!canWrite}
          style={{
            padding: '0.75rem 1.2rem',
            background: '#2d3a7a',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 700,
            cursor: canWrite ? 'pointer' : 'not-allowed',
            opacity: canWrite ? 1 : 0.65,
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
          background: ui.panel,
          padding: '1rem',
          borderRadius: '0.75rem',
          border: `1px solid ${ui.border}`,
          marginBottom: '1rem'
        }}
      >
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2.2fr) repeat(3, minmax(0, 1fr))', gap: '0.75rem', alignItems: 'stretch' }}>
          <div style={{ position: 'relative', minWidth: 0 }}>
            <Search
              size={18}
              style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: ui.textFaint }}
            />
            <input
              type="text"
              placeholder="Search title, description, speaker..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                border: `1px solid ${ui.borderSoft}`,
                borderRadius: '0.5rem',
                fontSize: '0.875rem'
              }}
            />
          </div>

          <DropdownSelect
            value={filterType}
            onChange={(event) => setFilterType(event.target.value)}
            style={{
              minWidth: 0,
              padding: '0.75rem',
              border: `1px solid ${ui.borderSoft}`,
              borderRadius: '0.5rem',
              fontSize: '0.875rem'
            }}
          >
            <option value="all">All Types</option>
            <option value="image">Image</option>
            <option value="video">Video</option>
            <option value="audio">Audio</option>
          </DropdownSelect>

          <DropdownSelect
            value={filterCategory}
            onChange={(event) => setFilterCategory(event.target.value)}
            style={{
              minWidth: 0,
              padding: '0.75rem',
              border: `1px solid ${ui.borderSoft}`,
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
          </DropdownSelect>

          <DropdownSelect
            value={filterDate}
            onChange={(event) => setFilterDate(event.target.value)}
            style={{
              minWidth: 0,
              padding: '0.75rem',
              border: `1px solid ${ui.borderSoft}`,
              borderRadius: '0.5rem',
              fontSize: '0.875rem'
            }}
          >
            {ADMIN_DATE_FILTER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </DropdownSelect>
        </div>

        {filteredMedia.length > 0 && (
          <div style={{ marginTop: '0.8rem', display: 'flex', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', fontWeight: 600, color: ui.textMuted }}>
              <input
                type="checkbox"
                checked={selectedMedia.length > 0 && selectedMedia.length === filteredMedia.length}
                onChange={(event) => handleSelectAllMedia(event.target.checked)}
              />
              Select all filtered media
            </label>

            {selectedMedia.length > 0 && (
              <div style={{ display: 'inline-flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => handleBulkMediaAction('category')} style={{ padding: '0.45rem 0.7rem', borderRadius: '0.4rem', border: `1px solid ${ui.borderSoft}`, background: ui.panel, color: ui.textMuted, fontWeight: 600, cursor: 'pointer' }}>
                  Set Category
                </button>
                <button type="button" onClick={() => handleBulkMediaAction('delete')} style={{ padding: '0.45rem 0.7rem', borderRadius: '0.4rem', border: 'none', background: '#ef4444', color: 'white', fontWeight: 700, cursor: 'pointer' }}>
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
        {filteredMedia.map((item) => {
          const TypeIcon = getTypeIcon(item.type)
          const assetCount = Array.isArray(item.media) ? item.media.length : 0

          return (
            <div
              key={item.id}
              style={{ background: ui.panel, borderRadius: '0.75rem', border: `1px solid ${ui.border}`, overflow: 'hidden' }}
            >
              {getCardPreview(item)}
              <div style={{ padding: '1rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <h3 style={{ margin: 0, color: ui.textPrimary, fontSize: '1rem' }}>{item.title}</h3>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                    <input
                      type="checkbox"
                      checked={selectedMedia.includes(String(item.id))}
                      onChange={() => handleSelectMediaItem(String(item.id))}
                    />
                    <TypeIcon size={16} color={ui.textSecondary} />
                  </div>
                </div>

                <p style={{ margin: '0 0 0.5rem', color: ui.textSecondary, fontSize: '0.875rem' }}>
                  {item.description || 'No description'}
                </p>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.6rem' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: ui.textMuted,
                      background: ui.panelSubtle,
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.375rem'
                    }}
                  >
                    {item.category}
                  </span>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      color: ui.textMuted,
                      background: '#eef2ff',
                      padding: '0.25rem 0.5rem',
                      borderRadius: '0.375rem'
                    }}
                  >
                    {assetCount} asset{assetCount === 1 ? '' : 's'}
                  </span>
                  {/* Status badge */}
                  <span
                    style={{
                      fontSize: '0.7rem',
                      fontWeight: 700,
                      padding: '0.2rem 0.5rem',
                      borderRadius: '0.375rem',
                      background: item.status === 'published'
                        ? (darkMode ? '#083127' : '#dcfce7')
                        : (darkMode ? '#3b1f05' : '#fef9c3'),
                      color: item.status === 'published'
                        ? (darkMode ? '#6ee7b7' : '#166534')
                        : (darkMode ? '#fcd34d' : '#92400e'),
                      textTransform: 'uppercase',
                      letterSpacing: '0.04em'
                    }}
                  >
                    {item.status === 'published' ? 'Published' : 'Pending Review'}
                  </span>
                </div>

                {item.speaker && (
                  <p style={{ margin: '0 0 0.65rem', color: ui.textSecondary, fontSize: '0.8rem', fontWeight: 600 }}>
                    Speaker: {item.speaker}
                  </p>
                )}

                <p style={{ margin: '0 0 0.65rem', color: ui.textFaint, fontSize: '0.75rem' }}>
                  Last updated: {formatStamp(item.updatedAt || item.createdAt)}
                </p>

                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  {canWrite && (
                    <button
                      type="button"
                      onClick={() => handleEdit(item)}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        border: 'none',
                        borderRadius: '0.375rem',
                        background: ui.panelSubtle,
                        color: ui.textMuted,
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
                  )}
                  {/* Approve button for reviewers on pending items */}
                  {canApprove && item.status !== 'published' && (
                    <button
                      type="button"
                      onClick={() => handleApprove(item)}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        border: 'none',
                        borderRadius: '0.375rem',
                        background: '#dcfce7',
                        color: '#166534',
                        cursor: 'pointer',
                        fontWeight: 700,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.82rem'
                      }}
                    >
                      ✓ Approve
                    </button>
                  )}
                  {/* Submit for review for editors on drafted/pending items */}
                  {canWrite && !canApprove && item.status !== 'published' && (
                    <button
                      type="button"
                      onClick={() => handleSubmitForReview(item)}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        border: 'none',
                        borderRadius: '0.375rem',
                        background: '#fef9c3',
                        color: '#92400e',
                        cursor: 'pointer',
                        fontWeight: 600,
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '0.35rem',
                        fontSize: '0.82rem'
                      }}
                    >
                      Submit for Review
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDelete(item.id)}
                    disabled={!canWrite && !canApprove}
                    style={{
                      flex: '0 0 auto',
                      padding: '0.5rem 0.65rem',
                      border: 'none',
                      borderRadius: '0.375rem',
                      background: '#fee2e2',
                      color: '#991b1b',
                      cursor: (canWrite || canApprove) ? 'pointer' : 'not-allowed',
                      opacity: (canWrite || canApprove) ? 1 : 0.65,
                      fontWeight: 600,
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      gap: '0.35rem'
                    }}
                  >
                    <Trash2 size={14} />
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
            background: ui.panel,
            borderRadius: '0.75rem',
            border: `1px solid ${ui.border}`,
            padding: '2rem',
            textAlign: 'center',
            color: ui.textFaint
          }}
        >
          No media items match your filters.
        </div>
      )}

      <AdminModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        title={modalConfig.title}
        tone={modalConfig.tone}
        onConfirm={handleModalConfirm}
        showInput={modalConfig.showInput}
        inputValue={modalConfig.inputValue}
        onInputChange={(val) => setModalConfig(prev => ({ ...prev, inputValue: val }))}
        inputPlaceholder={modalConfig.inputPlaceholder}
        confirmLabel={modalConfig.confirmLabel}
        cancelLabel={modalConfig.cancelLabel}
      >
        <p style={{ margin: 0 }}>{modalConfig.message}</p>
      </AdminModal>
    </div>
  )
}

export default MediaManager
