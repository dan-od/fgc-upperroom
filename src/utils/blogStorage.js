import { getAdminSessionToken } from './adminApi'
import { toApiUrl, toAssetUrl } from './appPaths'
export const BLOG_STORAGE_KEY = 'admin_blog_posts'

export const BLOG_CATEGORIES = [
  { value: 'article', label: 'Article' },
  { value: 'devotional', label: 'Devotional' },
  { value: 'sunday-school', label: 'Sunday School' }
]

export const BLOG_WORKFLOW_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' }
]

const CATEGORY_SET = new Set(BLOG_CATEGORIES.map((category) => category.value))
const BLOG_STATUS_SET = new Set(BLOG_WORKFLOW_STATUSES.map((status) => status.value))

const buildAuthHeaders = (headers = {}) => {
  const token = getAdminSessionToken()
  if (!token) return headers
  return { ...headers, Authorization: `Bearer ${token}` }
}

const normalizeCategory = (value) => {
  const normalized = String(value || 'article')
    .toLowerCase()
    .trim()
    .replace(/[_\s]+/g, '-')

  if (CATEGORY_SET.has(normalized)) {
    return normalized
  }

  if (normalized === 'sundayschool') {
    return 'sunday-school'
  }

  return 'article'
}

const normalizeStatus = (value) => {
  const normalized = String(value || 'draft').toLowerCase().trim()
  return BLOG_STATUS_SET.has(normalized) ? normalized : 'draft'
}

const toISODate = (value) => {
  if (!value) return new Date().toISOString()
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date().toISOString() : parsed.toISOString()
}

const inferExcerpt = (content) => {
  const plain = String(content || '').replace(/\s+/g, ' ').trim()
  if (!plain) {
    return 'No excerpt provided yet.'
  }

  if (plain.length <= 170) {
    return plain
  }

  return `${plain.slice(0, 167)}...`
}

const normalizeTags = (tags) => {
  if (Array.isArray(tags)) {
    return tags
      .map((tag) => String(tag).trim())
      .filter(Boolean)
      .join(', ')
  }

  return String(tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
    .join(', ')
}

export const normalizePost = (post, index = 0) => {
  const title = String(post?.title || '').trim()
  const content = String(post?.content || '').trim()

  const createdAt = toISODate(post?.createdAt || post?.updatedAt || post?.date)
  const updatedAt = post?.updatedAt ? toISODate(post.updatedAt) : null
  const scheduledFor = post?.scheduledFor ? toISODate(post.scheduledFor) : null
  const publishedAt = post?.publishedAt ? toISODate(post.publishedAt) : null
  const reviewedAt = post?.reviewedAt ? toISODate(post.reviewedAt) : null

  return {
    id: post?.id ?? Date.now() + index,
    title: title || `Untitled Post ${index + 1}`,
    content,
    category: normalizeCategory(post?.category),
    author: String(post?.author || 'Admin Team').trim() || 'Admin Team',
    excerpt: String(post?.excerpt || '').trim() || inferExcerpt(content),
    tags: normalizeTags(post?.tags),
    featured: Boolean(post?.featured),
    status: normalizeStatus(post?.status),
    image: String(post?.image || post?.coverImage || '').trim(),
    createdAt,
    updatedAt,
    scheduledFor,
    reviewedAt,
    publishedAt,
    workflow: {
      submittedAt: post?.workflow?.submittedAt ? toISODate(post.workflow.submittedAt) : null,
      reviewedBy: String(post?.workflow?.reviewedBy || '').trim() || null,
      approvedBy: String(post?.workflow?.approvedBy || '').trim() || null,
      rejectedReason: String(post?.workflow?.rejectedReason || '').trim() || null
    },
    versions: Array.isArray(post?.versions)
      ? post.versions
          .map((item, idx) => ({
            id: String(item?.id || `v${idx + 1}`),
            createdAt: toISODate(item?.createdAt || createdAt),
            reason: String(item?.reason || '').trim() || 'revision',
            snapshot: item?.snapshot && typeof item.snapshot === 'object' ? item.snapshot : null
          }))
          .filter((item) => item.snapshot)
      : []
  }
}

const sortPostsByDateDesc = (posts) => {
  return [...posts].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export const formatBlogCategory = (value) => {
  const matched = BLOG_CATEGORIES.find((category) => category.value === value)
  return matched?.label || 'Article'
}

export const getTagList = (tags) => {
  return String(tags || '')
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export const estimateReadTime = (content) => {
  const words = String(content || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length

  if (!words) {
    return 1
  }

  return Math.max(1, Math.round(words / 200))
}

export const readBlogPosts = async () => {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const response = await fetch(toApiUrl('/api/admin/blog'), {
      headers: buildAuthHeaders()
    })

    if (!response.ok) {
      throw new Error('Failed to fetch admin blog posts')
    }

    const payload = await response.json()
    const posts = Array.isArray(payload?.data) ? payload.data : []
    return sortPostsByDateDesc(posts.map(normalizePost))
  } catch (error) {
    console.error('Error reading blog posts from server:', error)
    // Fallback to localStorage for single-user dev if server is down
    const raw = window.localStorage.getItem(BLOG_STORAGE_KEY)
    if (!raw) return []
    try {
      const parsed = JSON.parse(raw)
      return sortPostsByDateDesc(Array.isArray(parsed) ? parsed.map(normalizePost) : [])
    } catch {
      return []
    }
  }
}

export const writeBlogPosts = async (posts) => {
  if (typeof window === 'undefined') {
    return
  }

  const normalized = sortPostsByDateDesc(posts.map((post, index) => normalizePost(post, index)))

  try {
    const response = await fetch(toApiUrl('/api/admin/blog'), {
      method: 'PUT',
      headers: buildAuthHeaders({
        'Content-Type': 'application/json'
      }),
      body: JSON.stringify({ posts: normalized })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData?.error || 'Failed to save blog posts to server')
    }

    // Still sync to local storage for instant UI updates across tabs in same browser if needed
    window.localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(normalized))
    window.dispatchEvent(new CustomEvent('blogPostsUpdated'))
  } catch (error) {
    console.error('Error writing blog posts to server:', error)
    // Fallback save to localStorage
    window.localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(normalized))
    window.dispatchEvent(new CustomEvent('blogPostsUpdated'))
    throw error
  }
}

export const pushBlogVersion = (post, reason = 'revision') => {
  if (!post || typeof post !== 'object') return post
  const snapshot = {
    ...post,
    versions: undefined
  }
  const nextVersion = {
    id: `v-${Date.now()}`,
    createdAt: new Date().toISOString(),
    reason,
    snapshot
  }
  return {
    ...post,
    versions: [nextVersion, ...(Array.isArray(post.versions) ? post.versions : [])].slice(0, 25)
  }
}

export const applyBlogPublishingSchedule = (posts = []) => {
  const now = Date.now()
  let changed = false

  const next = posts.map((post) => {
    const normalized = normalizePost(post)
    if (normalized.status === 'scheduled' && normalized.scheduledFor) {
      const scheduleTime = new Date(normalized.scheduledFor).getTime()
      if (Number.isFinite(scheduleTime) && scheduleTime <= now) {
        changed = true
        return {
          ...normalized,
          status: 'published',
          publishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
    }
    return normalized
  })

  return { posts: next, changed }
}

export const getPublicBlogPosts = async () => {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const response = await fetch(toApiUrl('/blog'))
    if (!response.ok) {
      throw new Error('Failed to fetch public blog posts')
    }
    const payload = await response.json()
    return Array.isArray(payload?.data) ? payload.data : []
  } catch (error) {
    console.error('Error fetching public blog posts:', error)
    return []
  }
}
