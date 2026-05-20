import { useEffect, useMemo, useRef, useState } from 'react'
import {
  approveAdminMediaItem, DEFAULT_MEDIA_THUMBNAIL, extractYouTubeId,
  readAdminMediaItems, toYouTubeEmbedUrl, uploadAdminMediaFiles, writeAdminMediaItems
} from '../../../utils/mediaStorage'
import { recordAdminAudit } from '../../../utils/adminApi'
import { matchesAdminDateFilter } from '../../../utils/adminDateFilters'
import { buildPayload, createEmptyForm, formFromItem } from './mediaPayload'

export function useMediaCrud({ canWrite, canApprove, setNotice, openModal }) {
  const [mediaItems, setMediaItems] = useState([])
  const [selectedMedia, setSelectedMedia] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterDate, setFilterDate] = useState('all')
  const [formData, setFormData] = useState(createEmptyForm)
  const [isUploading, setIsUploading] = useState(false)
  const [view, setView] = useState('list')
  const fileInputRef = useRef(null)
  const audit = (action, details = {}) => recordAdminAudit({ action, resource: 'content.media', details }).catch(() => {})

  useEffect(() => { readAdminMediaItems().then(setMediaItems) }, [])
  useEffect(() => {
    const validIds = new Set(mediaItems.map((item) => String(item.id)))
    setSelectedMedia((prev) => prev.filter((id) => validIds.has(String(id))))
  }, [mediaItems])

  const persistMedia = async (updatedMedia) => {
    try {
      await writeAdminMediaItems(updatedMedia)
      setMediaItems(await readAdminMediaItems())
      return true
    } catch (err) {
      setNotice({ tone: 'error', text: err.message || 'Failed to save. Please try again.' })
      return false
    }
  }

  const resetForm = () => { setFormData(createEmptyForm()); setNotice(null); setView('list') }
  const openCreate = () => { setFormData(createEmptyForm()); setNotice(null); setView('create') }

  const handleEdit = (item) => { setFormData(formFromItem(item)); setNotice(null); setView('edit') }

  const handleDelete = (id) => {
    if (!canWrite) { setNotice({ tone: 'error', text: 'Your role cannot delete media items.' }); return }
    const found = mediaItems.find((item) => item.id === id)
    openModal({
      title: 'Delete Media Item', tone: 'danger', confirmLabel: 'Delete',
      message: found ? `Delete "${found.title}"? This cannot be undone.` : 'Delete this media item? This cannot be undone.',
      onConfirm: async () => {
        const saved = await persistMedia(mediaItems.filter((item) => item.id !== id))
        if (saved) { setNotice({ tone: 'success', text: 'Media item deleted.' }); audit('media.delete', { id }) }
      }
    })
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }
  const handlePickMedia = () => fileInputRef.current?.click()

  const handleFileChange = async (event) => {
    const files = Array.from(event.target.files || [])
    event.target.value = ''
    if (!files.length) return
    const allowedFiles = files.filter((f) => f.type.startsWith('image/') || f.type.startsWith('video/') || f.type.startsWith('audio/'))
    if (!allowedFiles.length) { setNotice({ tone: 'error', text: 'Select image, video, or audio files only.' }); return }
    const oversized = allowedFiles.find((f) => f.size > 20 * 1024 * 1024)
    if (oversized) { setNotice({ tone: 'error', text: `${oversized.name} is above 20MB. Please upload a smaller file.` }); return }
    const existingSize = formData.media.reduce((sum, a) => sum + Number(a.fileSize || 0), 0)
    if (existingSize + allowedFiles.reduce((sum, f) => sum + f.size, 0) > 200 * 1024 * 1024) {
      setNotice({ tone: 'error', text: 'Total file size for this item exceeds 200MB. Upload fewer or smaller files, or use YouTube links for videos.' })
      return
    }
    try {
      setIsUploading(true)
      const assets = await uploadAdminMediaFiles(allowedFiles)
      setFormData((prev) => ({ ...prev, media: [...prev.media, ...assets] }))
      setNotice({ tone: 'success', text: `${assets.length} media file${assets.length > 1 ? 's' : ''} added.` })
    } catch { setNotice({ tone: 'error', text: 'Unable to process the selected files. Please retry.' })
    } finally { setIsUploading(false) }
  }

  const removeAsset = (assetId) => setFormData((prev) => ({ ...prev, media: prev.media.filter((a) => a.id !== assetId) }))

  const handleAddYouTubeVideo = () => {
    const rawUrl = String(formData.youtubeUrlInput || '').trim()
    const videoId = extractYouTubeId(rawUrl)
    if (!videoId) { setNotice({ tone: 'error', text: 'Enter a valid YouTube URL.' }); return }
    const embedUrl = toYouTubeEmbedUrl(rawUrl)
    if (formData.media.some((a) => a.videoUrl === embedUrl)) { setNotice({ tone: 'error', text: 'This YouTube video is already attached.' }); return }
    setFormData((prev) => ({
      ...prev, youtubeUrlInput: '',
      media: [...prev.media, { id: `asset-youtube-${videoId}-${Date.now()}`, type: 'video', videoUrl: embedUrl, src: '', thumbnail: DEFAULT_MEDIA_THUMBNAIL, alt: prev.title || 'Sermon video' }]
    }))
    setNotice({ tone: 'success', text: 'YouTube video attached.' })
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!canWrite) { setNotice({ tone: 'error', text: 'Your role cannot modify media items.' }); return }
    const title = String(formData.title || '').trim()
    if (!title) { setNotice({ tone: 'error', text: 'Title is required.' }); return }
    if (!formData.media.length) { setNotice({ tone: 'error', text: 'Add at least one image or video for this upload.' }); return }
    if (formData.mediaCategory === 'sermons' && !String(formData.speaker || '').trim()) {
      setNotice({ tone: 'error', text: 'Speaker name is required for sermon uploads.' }); return
    }
    const nowIso = new Date().toISOString()
    const existing = mediaItems.find((item) => item.id === formData.id)
    const targetStatus = canApprove ? 'published' : 'pending_review'
    const payload = buildPayload({ formData, existing, targetStatus, nowIso })
    if (view === 'create') {
      const saved = await persistMedia([payload, ...mediaItems])
      if (!saved) return
      setNotice({ tone: 'success', text: canApprove ? 'Media published.' : 'Media submitted for review.' })
      audit('media.create', { id: payload.id, category: payload.category, assets: payload.media.length, status: payload.status })
    } else {
      const saved = await persistMedia(mediaItems.map((item) => (item.id === payload.id ? payload : item)))
      if (!saved) return
      setNotice({ tone: 'success', text: canApprove ? 'Media published.' : 'Media updated and submitted for review.' })
      audit('media.update', { id: payload.id, category: payload.category, assets: payload.media.length, status: payload.status })
    }
    setView('list')
    setFormData(createEmptyForm())
  }

  const handleApprove = async (item) => {
    if (!canApprove) { setNotice({ tone: 'error', text: 'Your role cannot approve media.' }); return }
    try {
      await approveAdminMediaItem(item.id)
      setMediaItems(await readAdminMediaItems())
      setNotice({ tone: 'success', text: `"${item.title}" approved and published.` })
      audit('media.approve_and_publish', { id: item.id })
    } catch (error) { setNotice({ tone: 'error', text: error?.message || 'Unable to approve media right now.' }) }
  }

  const handleSubmitForReview = async (item) => {
    if (!canWrite) { setNotice({ tone: 'error', text: 'Your role cannot submit media for review.' }); return }
    const nowIso = new Date().toISOString()
    const saved = await persistMedia(mediaItems.map((m) => m.id !== item.id ? m : { ...m, status: 'pending_review', updatedAt: nowIso }))
    if (saved) { setNotice({ tone: 'success', text: 'Media submitted for review.' }); audit('media.submit_review', { id: item.id }) }
  }

  const handleSelectMediaItem = (id) => setSelectedMedia((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  const handleSelectAllMedia = (checked) => setSelectedMedia(checked ? filteredMedia.map((item) => String(item.id)) : [])

  const filteredMedia = useMemo(() => mediaItems.filter((item) => {
    const term = searchTerm.toLowerCase().trim()
    const inText = !term || item.title.toLowerCase().includes(term) || String(item.description || '').toLowerCase().includes(term) || String(item.speaker || '').toLowerCase().includes(term)
    const inType = filterType === 'all' || item.type === filterType || (Array.isArray(item.media) && item.media.some((a) => a.type === filterType))
    const inCategory = filterCategory === 'all' || item.category === filterCategory
    return inText && inType && inCategory && matchesAdminDateFilter(item.publishedAt || item.updatedAt || item.createdAt || item.date, filterDate)
  }), [mediaItems, searchTerm, filterType, filterCategory, filterDate])

  const handleBulkMediaAction = async (action) => {
    if (!selectedMedia.length) return
    if (!canWrite) { setNotice({ tone: 'error', text: 'Your role cannot run bulk media actions.' }); return }
    const selectedSet = new Set(selectedMedia.map(String))
    if (action === 'delete') {
      openModal({
        title: 'Bulk Delete', tone: 'danger', confirmLabel: 'Delete All',
        message: `Delete ${selectedMedia.length} selected media item(s)? This action cannot be undone.`,
        onConfirm: async () => {
          const saved = await persistMedia(mediaItems.filter((item) => !selectedSet.has(String(item.id))))
          if (saved) { setSelectedMedia([]); setNotice({ tone: 'success', text: 'Selected media items deleted.' }); audit('media.bulk_delete', { count: selectedMedia.length }) }
        }
      })
      return
    }
    if (action === 'category') {
      openModal({
        title: 'Batch Category', showInput: true, inputPlaceholder: 'Category name...',
        message: 'Enter the category for these items (e.g., sermons, worship, youth).',
        onConfirm: async (input) => {
          if (!input) return
          const cat = String(input).trim().toLowerCase()
          const saved = await persistMedia(mediaItems.map((item) =>
            !selectedSet.has(String(item.id)) ? item : { ...item, category: cat, mediaCategory: cat, updatedAt: new Date().toISOString() }
          ))
          if (saved) { setSelectedMedia([]); setNotice({ tone: 'success', text: 'Selected media category updated.' }); audit('media.bulk_category', { count: selectedMedia.length, category: cat }) }
        }
      })
    }
  }

  return {
    view, setView, mediaItems, selectedMedia, setSelectedMedia,
    searchTerm, setSearchTerm, filterType, setFilterType,
    filterCategory, setFilterCategory, filterDate, setFilterDate,
    formData, setFormData, isUploading, fileInputRef, filteredMedia,
    resetForm, openCreate, handleEdit, handleDelete, handleChange,
    handlePickMedia, handleFileChange, removeAsset, handleAddYouTubeVideo,
    handleSubmit, handleApprove, handleSubmitForReview,
    handleSelectMediaItem, handleSelectAllMedia, handleBulkMediaAction
  }
}
