import { normalizeAdminMediaItem, normalizeTitleKey } from '../../../utils/mediaStorage'

export const createEmptyForm = () => ({
  id: '', title: '', description: '', mediaCategory: 'worship',
  speaker: '', keypoint: '', syncKey: '', youtubeUrlInput: '', status: 'pending_review', media: []
})

export const formFromItem = (item) => ({
  id: item.id, title: item.title, description: item.description || '',
  mediaCategory: item.category || item.mediaCategory || 'worship',
  speaker: item.speaker || '', keypoint: item.keypoint || '',
  syncKey: item.syncKey || item.mergeKey || normalizeTitleKey(item.title),
  youtubeUrlInput: '', media: Array.isArray(item.media) ? item.media : []
})

export const buildPayload = ({ formData, existing, targetStatus, nowIso }) => {
  const title = String(formData.title || '').trim()
  return normalizeAdminMediaItem({
    id: existing?.id || `admin-media-${Date.now()}`, title,
    description: String(formData.description || '').trim(),
    category: formData.mediaCategory, mediaCategory: formData.mediaCategory,
    speaker: String(formData.speaker || '').trim(), keypoint: String(formData.keypoint || '').trim(),
    syncKey: String(formData.syncKey || '').trim(), mergeKey: normalizeTitleKey(formData.syncKey || title),
    status: existing?.status === 'published' ? 'published' : targetStatus,
    publishedAt: targetStatus === 'published' ? nowIso : existing?.publishedAt || null,
    media: formData.media, timestamp: existing?.timestamp || Date.now(),
    createdAt: existing?.createdAt || nowIso, updatedAt: nowIso
  })
}
