export const TESTIMONIES_STORAGE_KEY = 'admin_testimonies'

const normalizeTestimony = (item, index = 0) => {
  const name = String(item?.name || '').trim()
  const role = String(item?.role || '').trim()
  const quote = String(item?.quote || '').trim()

  return {
    id: item?.id ?? Date.now() + index,
    name: name || 'Anonymous',
    role: role || 'Member',
    quote: quote || '',
    createdAt: item?.createdAt || new Date().toISOString(),
    updatedAt: item?.updatedAt || null
  }
}

const sortByDateDesc = (items) => {
  return [...items].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
}

export const readTestimonies = () => {
  if (typeof window === 'undefined') {
    return []
  }

  const raw = window.localStorage.getItem(TESTIMONIES_STORAGE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return sortByDateDesc(parsed.map(normalizeTestimony))
  } catch {
    return []
  }
}

export const writeTestimonies = (items) => {
  if (typeof window === 'undefined') {
    return
  }

  const normalized = sortByDateDesc(items.map((item, index) => normalizeTestimony(item, index)))
  window.localStorage.setItem(TESTIMONIES_STORAGE_KEY, JSON.stringify(normalized))

  // Notify any open pages/components that the testimonies list has been updated.
  window.dispatchEvent(new CustomEvent('testimoniesUpdated'))
}

export const seedTestimoniesIfEmpty = () => {
  if (typeof window === 'undefined') {
    return []
  }

  const hasStored = window.localStorage.getItem(TESTIMONIES_STORAGE_KEY) !== null
  if (hasStored) {
    return readTestimonies()
  }

  // Default is empty (no sample testimonies)
  writeTestimonies([])
  return []
}
