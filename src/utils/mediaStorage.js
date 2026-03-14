export const ADMIN_MEDIA_STORAGE_KEY = 'admin_media'
export const DEFAULT_MEDIA_THUMBNAIL = '/assets/media/Senior Pastor.jpeg'

export const MEDIA_CATEGORIES = [
  { value: 'worship', label: 'Worship' },
  { value: 'youth', label: 'Youth' },
  { value: 'sermons', label: 'Sermons' },
  { value: 'audio', label: 'Audio/Music' },
  { value: 'community', label: 'Community' },
  { value: 'events', label: 'Events' }
]

const MEDIA_TYPES = new Set(['image', 'video', 'audio'])
const MEDIA_CATEGORY_SET = new Set(MEDIA_CATEGORIES.map((item) => item.value))

export const normalizeTitleKey = (value = '') => {
  return String(value)
    .toLowerCase()
    .trim()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export const extractYouTubeId = (url = '') => {
  const value = String(url || '').trim()
  if (!value) {
    return null
  }

  const shortMatch = value.match(/youtu\.be\/([^?&/]+)/i)
  if (shortMatch?.[1]) {
    return shortMatch[1]
  }

  const watchMatch = value.match(/[?&]v=([^&]+)/i)
  if (watchMatch?.[1]) {
    return watchMatch[1]
  }

  const embedMatch = value.match(/embed\/([^?&/]+)/i)
  if (embedMatch?.[1]) {
    return embedMatch[1]
  }

  const shortsMatch = value.match(/shorts\/([^?&/]+)/i)
  if (shortsMatch?.[1]) {
    return shortsMatch[1]
  }

  return null
}

export const toYouTubeEmbedUrl = (url = '') => {
  const id = extractYouTubeId(url)
  return id ? `https://www.youtube.com/embed/${id}` : ''
}

const normalizeType = (value = 'image') => {
  const normalized = String(value || 'image').toLowerCase().trim()
  if (MEDIA_TYPES.has(normalized)) {
    return normalized
  }
  return 'image'
}

const normalizeMediaCategory = (value = 'worship') => {
  const normalized = String(value || 'worship').toLowerCase().trim()
  if (MEDIA_CATEGORY_SET.has(normalized)) {
    return normalized
  }
  return 'worship'
}

const toTimestamp = (value) => {
  const directNumber = Number(value)
  if (Number.isFinite(directNumber) && directNumber > 0) {
    return directNumber
  }

  const parsed = new Date(value)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getTime()
  }

  return Date.now()
}

const normalizeText = (value) => String(value || '').trim()

export const normalizeMediaAsset = (asset, index = 0, fallbackType = 'image') => {
  const source = asset || {}
  const baseType = normalizeType(source.type || fallbackType)

  const normalized = {
    id: String(source.id || `asset-${index + 1}`),
    type: baseType,
    src: '',
    thumbnail: '',
    videoUrl: '',
    audioUrl: '',
    alt: normalizeText(source.alt),
    name: normalizeText(source.name),
    mimeType: normalizeText(source.mimeType)
  }

  if (baseType === 'video') {
    const candidate = normalizeText(source.videoUrl || source.src)
    const embedUrl = toYouTubeEmbedUrl(candidate)

    normalized.videoUrl = embedUrl
    normalized.src = embedUrl ? normalizeText(source.src) : candidate
    normalized.thumbnail = normalizeText(source.thumbnail || source.poster || source.previewUrl) || DEFAULT_MEDIA_THUMBNAIL
    return normalized
  }

  if (baseType === 'audio') {
    normalized.audioUrl = normalizeText(source.audioUrl || source.src)
    normalized.src = normalizeText(source.src)
    normalized.thumbnail = normalizeText(source.thumbnail || source.previewUrl) || DEFAULT_MEDIA_THUMBNAIL
    return normalized
  }

  normalized.src = normalizeText(source.src || source.thumbnail || source.previewUrl)
  normalized.thumbnail = normalizeText(source.thumbnail || source.src || source.previewUrl)

  return normalized
}

const buildLegacyAssetList = (raw = {}) => {
  if (Array.isArray(raw.media) && raw.media.length > 0) {
    return raw.media
  }

  const legacyType = normalizeType(raw.type || raw.category)

  if (normalizeText(raw.videoUrl)) {
    const embedUrl = toYouTubeEmbedUrl(raw.videoUrl)
    return [
      {
        type: 'video',
        videoUrl: embedUrl,
        src: embedUrl ? '' : normalizeText(raw.videoUrl),
        thumbnail: normalizeText(raw.previewUrl || raw.thumbnail || raw.src) || DEFAULT_MEDIA_THUMBNAIL,
        alt: normalizeText(raw.title)
      }
    ]
  }

  if (normalizeText(raw.audioUrl) || legacyType === 'audio') {
    return [
      {
        type: 'audio',
        audioUrl: normalizeText(raw.audioUrl || raw.src),
        src: normalizeText(raw.src),
        thumbnail: normalizeText(raw.previewUrl || raw.thumbnail || raw.src) || DEFAULT_MEDIA_THUMBNAIL,
        alt: normalizeText(raw.title)
      }
    ]
  }

  if (normalizeText(raw.previewUrl) || normalizeText(raw.src) || normalizeText(raw.thumbnail)) {
    return [
      {
        type: legacyType === 'video' ? 'video' : 'image',
        src: normalizeText(raw.previewUrl || raw.src || raw.thumbnail),
        thumbnail: normalizeText(raw.previewUrl || raw.thumbnail || raw.src),
        alt: normalizeText(raw.title)
      }
    ]
  }

  return []
}

export const normalizeAdminMediaItem = (rawItem, index = 0) => {
  const source = rawItem || {}
  const title = normalizeText(source.title) || `Media Item ${index + 1}`
  const category = normalizeMediaCategory(source.mediaCategory || source.category)
  const assetsRaw = buildLegacyAssetList(source)
  const fallbackType = normalizeType(source.type || source.category)
  const media = assetsRaw.map((asset, assetIndex) => normalizeMediaAsset(asset, assetIndex, fallbackType))
  const primaryAsset = media[0] || {}
  const type = normalizeType(primaryAsset.type || fallbackType)
  const timestamp = toTimestamp(source.timestamp || source.createdAt || source.updatedAt || source.date)
  const createdAt = source.createdAt
    ? new Date(source.createdAt).toISOString()
    : new Date(timestamp).toISOString()

  return {
    id: String(source.id || `admin-media-${timestamp}-${index}`),
    title,
    description: normalizeText(source.description),
    category,
    mediaCategory: category,
    type,
    speaker: normalizeText(source.speaker),
    keypoint: normalizeText(source.keypoint),
    syncKey: normalizeText(source.syncKey),
    mergeKey: normalizeTitleKey(source.syncKey || source.mergeKey || title),
    thumbnail:
      normalizeText(primaryAsset.thumbnail || source.thumbnail || source.previewUrl || primaryAsset.src) ||
      DEFAULT_MEDIA_THUMBNAIL,
    src:
      normalizeText(primaryAsset.src || source.src || primaryAsset.thumbnail || source.thumbnail) ||
      DEFAULT_MEDIA_THUMBNAIL,
    videoUrl: normalizeText(primaryAsset.videoUrl || source.videoUrl),
    audioUrl: normalizeText(primaryAsset.audioUrl || source.audioUrl),
    media,
    timestamp,
    date: new Date(timestamp).toISOString().slice(0, 10),
    createdAt,
    updatedAt: source.updatedAt ? new Date(source.updatedAt).toISOString() : null
  }
}

export const readAdminMediaItems = () => {
  if (typeof window === 'undefined') {
    return []
  }

  const raw = window.localStorage.getItem(ADMIN_MEDIA_STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return parsed
      .map((item, index) => normalizeAdminMediaItem(item, index))
      .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
  } catch {
    return []
  }
}

export const writeAdminMediaItems = (items) => {
  if (typeof window === 'undefined') {
    return
  }

  const normalized = (Array.isArray(items) ? items : [])
    .map((item, index) => normalizeAdminMediaItem(item, index))
    .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))

  window.localStorage.setItem(ADMIN_MEDIA_STORAGE_KEY, JSON.stringify(normalized))
}
