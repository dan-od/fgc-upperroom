import { getAdminSessionToken } from './adminApi'
import { toApiUrl } from './appPaths'

const buildAuthHeaders = (headers = {}) => {
  const token = getAdminSessionToken()
  if (!token) return headers
  return { ...headers, Authorization: `Bearer ${token}` }
}

const request = async (url, options = {}) => {
  const response = await fetch(url, options)
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed (${response.status})`)
  }

  return payload
}

export const subscribeEmail = async ({ name, email, phoneNumber = '', source = 'website' }) => {
  return request(toApiUrl('/api/newsletter/subscribe'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, email, phoneNumber, source })
  })
}

export const syncEventEmailAudience = async (event) => {
  return request(toApiUrl('/api/newsletter/sync-event'), {
    method: 'POST',
    headers: buildAuthHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ event })
  })
}

export const fetchNewsletterSubscribers = async () => {
  return request(toApiUrl('/api/newsletter/subscribers'), {
    headers: buildAuthHeaders()
  })
}
