export const TESTIMONIES_STORAGE_KEY = 'admin_testimonies'

const DEFAULT_TESTIMONIES = [
  {
    id: 'seed-testimony-1',
    name: 'Sis. Favour C.',
    role: 'Member',
    quote: 'God gave me peace and direction during a difficult season through the prayers and teachings in Upper Room.',
    createdAt: '2026-03-05T09:30:00.000Z'
  },
  {
    id: 'seed-testimony-2',
    name: 'Bro. Daniel A.',
    role: 'Choir Unit',
    quote: 'After joining fellowship consistently, my prayer life became stronger and I found a clear sense of purpose.',
    createdAt: '2026-03-12T11:00:00.000Z'
  },
  {
    id: 'seed-testimony-3',
    name: 'Sis. Esther O.',
    role: 'First-time Visitor',
    quote: 'I came for one service and immediately felt at home. The warmth and love in this family are real.',
    createdAt: '2026-03-18T16:10:00.000Z'
  }
]

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

const getDefaultTestimonies = () => sortByDateDesc(DEFAULT_TESTIMONIES.map(normalizeTestimony))

export const readTestimonies = (options = {}) => {
  const fallbackToDefaultOnEmpty = Boolean(options?.fallbackToDefaultOnEmpty)

  if (typeof window === 'undefined') {
    return getDefaultTestimonies()
  }

  const raw = window.localStorage.getItem(TESTIMONIES_STORAGE_KEY)
  if (!raw) return getDefaultTestimonies()

  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return getDefaultTestimonies()

    const normalized = sortByDateDesc(parsed.map(normalizeTestimony))
    if (fallbackToDefaultOnEmpty && normalized.length === 0) {
      return getDefaultTestimonies()
    }

    return normalized
  } catch {
    return getDefaultTestimonies()
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

  writeTestimonies(DEFAULT_TESTIMONIES)
  return sortByDateDesc(DEFAULT_TESTIMONIES.map(normalizeTestimony))
}
