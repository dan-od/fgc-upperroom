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

const DEFAULT_BLOG_POSTS = [
  {
    id: 'seed-blog-1',
    title: 'Called to the Upper Room',
    content: `Acts 1:13-14 reminds us that the early believers gathered with one heart in prayer. The Upper Room is more than a meeting place for us; it is a posture of hunger for God's presence.

This week, take ten minutes each day to pray for revival among young people in our fellowship. Ask God for boldness, holiness, and compassion for souls.

As we stay together in prayer, we believe God will keep raising kingdom youths from Upper Room Mgbuoba.`,
    category: 'devotional',
    author: 'Upper Room Media Team',
    excerpt: 'The Upper Room is not just a location. It is a posture of prayer, unity, and hunger for God.',
    tags: 'prayer, revival, upper room',
    featured: true,
    status: 'published',
    image: '/assets/media/Senior Pastor.jpeg',
    createdAt: '2026-03-03T09:00:00.000Z'
  },
  {
    id: 'seed-blog-2',
    title: 'Sunday School Notes: Growing in Grace',
    content: `Memory Verse: 2 Peter 3:18 - "But grow in the grace, and in the knowledge of our Lord and Saviour Jesus Christ."

Lesson Outline:
1. Growth is expected in every believer.
2. Grace grows through prayer, scripture, and obedience.
3. Community helps us stay accountable.

Discussion Questions:
- What habits are helping your spiritual growth right now?
- What one habit will you start this week?`,
    category: 'sunday-school',
    author: 'Sunday School Unit',
    excerpt: 'Structured lesson notes on practical steps for growing in grace and knowledge.',
    tags: 'sunday school, discipleship, growth',
    featured: false,
    status: 'published',
    image: '/assets/media/events/images/teens_summit2026.png',
    createdAt: '2026-03-10T08:15:00.000Z'
  },
  {
    id: 'seed-blog-3',
    title: 'Why Fellowship Still Matters for Young Believers',
    content: `In a world full of digital noise, true fellowship remains essential. When believers gather, we strengthen one another through worship, the Word, and shared testimonies.

At Upper Room, fellowship creates room for mentorship, accountability, and healing conversations. Isolation weakens faith, but community fuels it.

Plan to attend the next service and bring someone with you. Your presence could be the encouragement another person needs.`,
    category: 'article',
    author: 'Upper Room Editorial',
    excerpt: 'Community is not optional in the Christian life. Fellowship strengthens faith and purpose.',
    tags: 'community, youth, fellowship',
    featured: false,
    status: 'published',
    image: '/assets/media/Senior Pastor.jpeg',
    createdAt: '2026-03-15T18:30:00.000Z'
  }
]

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
  window.dispatchEvent(new CustomEvent('blogPostsUpdated'))
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

  const { posts, changed } = applyBlogPublishingSchedule(loadedPosts)
  if (changed) {
    writeBlogPosts(posts)
  }

  return posts.filter((post) => post.status === 'published')
}
