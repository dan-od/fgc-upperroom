import { getAdminSessionToken } from './adminApi'
import { toApiUrl } from './appPaths'

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

const buildAuthHeaders = (headers = {}) => {
  const token = getAdminSessionToken()
  if (!token) {
    return headers
  }
  return { ...headers, Authorization: `Bearer ${token}` }
}

const request = async (resource, options = {}) => {
  const response = await fetch(toApiUrl(resource), options)
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(payload?.error || `Request failed (${response.status})`)
    error.status = response.status
    throw error
  }

  return payload
}

export const readPublicTestimonies = async () => {
  const payload = await request('/api/testimonies')
  const items = Array.isArray(payload?.data) ? payload.data : []
  return sortByDateDesc(items.map(normalizeTestimony))
}

export const readAdminTestimonies = async () => {
  const payload = await request('/api/admin/testimonies', {
    headers: buildAuthHeaders()
  })
  const items = Array.isArray(payload?.data) ? payload.data : []
  return sortByDateDesc(items.map(normalizeTestimony))
}

export const writeAdminTestimonies = async (items) => {
  const normalized = sortByDateDesc(items.map((item, index) => normalizeTestimony(item, index)))
  await request('/api/admin/testimonies', {
    method: 'PUT',
    headers: buildAuthHeaders({
      'Content-Type': 'application/json'
    }),
    body: JSON.stringify({ testimonies: normalized })
  })

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('testimoniesUpdated'))
  }

  return normalized
}
