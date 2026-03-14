export const BLOG_STORAGE_KEY = 'admin_blog_posts'

export const BLOG_CATEGORIES = [
  { value: 'article', label: 'Article' },
  { value: 'devotional', label: 'Devotional' },
  { value: 'sunday-school', label: 'Sunday School' },
  { value: 'testimony', label: 'Testimony' }
]

const CATEGORY_SET = new Set(BLOG_CATEGORIES.map((category) => category.value))

const DEFAULT_BLOG_POSTS = []

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
  return String(value || 'published').toLowerCase() === 'draft' ? 'draft' : 'published'
}

const toISODate = (value) => {
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

const normalizePost = (post, index = 0) => {
  const title = String(post?.title || '').trim()
  const content = String(post?.content || '').trim()

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
    createdAt: toISODate(post?.createdAt || post?.updatedAt || post?.date),
    updatedAt: post?.updatedAt ? toISODate(post.updatedAt) : null
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

export const readBlogPosts = () => {
  if (typeof window === 'undefined') {
    return []
  }

  const raw = window.localStorage.getItem(BLOG_STORAGE_KEY)
  if (!raw) {
    return []
  }

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) {
      return []
    }

    return sortPostsByDateDesc(parsed.map(normalizePost))
  } catch {
    return []
  }
}

export const writeBlogPosts = (posts) => {
  if (typeof window === 'undefined') {
    return
  }

  const normalized = sortPostsByDateDesc(posts.map((post, index) => normalizePost(post, index)))
  window.localStorage.setItem(BLOG_STORAGE_KEY, JSON.stringify(normalized))
}

export const seedBlogPostsIfEmpty = () => {
  if (typeof window === 'undefined') {
    return []
  }

  const hasStoredPosts = window.localStorage.getItem(BLOG_STORAGE_KEY) !== null
  if (hasStoredPosts) {
    return readBlogPosts()
  }

  writeBlogPosts(DEFAULT_BLOG_POSTS)
  return sortPostsByDateDesc(DEFAULT_BLOG_POSTS)
}

export const getPublicBlogPosts = () => {
  if (typeof window === 'undefined') {
    return DEFAULT_BLOG_POSTS.filter((post) => post.status === 'published')
  }

  const hasStoredPosts = window.localStorage.getItem(BLOG_STORAGE_KEY) !== null
  const loadedPosts = readBlogPosts()

  if (!hasStoredPosts) {
    return DEFAULT_BLOG_POSTS.filter((post) => post.status === 'published')
  }

  return loadedPosts.filter((post) => post.status === 'published')
}
