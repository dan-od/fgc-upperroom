export const DEFAULT_EVENT_CATEGORIES = ['general', 'youth', 'worship', 'outreach', 'conference']

export const normalizeCategory = (value) => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
}

export const formatCategoryLabel = (value) => {
  return String(value || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

export const mergeCategories = (...categoryLists) => {
  const merged = categoryLists
    .flat()
    .map((item) => normalizeCategory(item))
    .filter(Boolean)

  return Array.from(new Set(merged))
}

export const buildCategoriesFromEvents = (events = [], categoryBase = []) => {
  return mergeCategories(
    DEFAULT_EVENT_CATEGORIES,
    categoryBase,
    events.map((event) => event.category)
  )
}

export const EVENT_WORKFLOW_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' }
]

export const pushEventVersion = (event, reason = 'revision') => {
  const snapshot = {
    ...event,
    versions: undefined
  }
  const version = {
    id: `v-${Date.now()}`,
    createdAt: new Date().toISOString(),
    reason,
    snapshot
  }
  return {
    ...event,
    versions: [version, ...(Array.isArray(event.versions) ? event.versions : [])].slice(0, 20)
  }
}

export const applyScheduledEventTransitions = (events = []) => {
  const now = Date.now()
  let changed = false

  const next = events.map((event) => {
    if (event.status === 'scheduled' && event.scheduledPublishAt) {
      const time = new Date(event.scheduledPublishAt).getTime()
      if (Number.isFinite(time) && time <= now) {
        changed = true
        return {
          ...event,
          status: 'published',
          publishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
    }
    return event
  })

  return { events: next, changed }
}
