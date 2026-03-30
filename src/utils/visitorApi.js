const BOT_API_BASE = import.meta.env.VITE_BOT_API_URL || ''
const VISITORS_ENDPOINT = `${BOT_API_BASE}/bot/api/visitors`

const request = async (url, options = {}) => {
  const response = await fetch(url, options)
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(payload?.error || `Request failed (${response.status})`)
    error.status = response.status
    throw error
  }

  return payload
}

const toIsoDate = (value) => {
  const parsed = new Date(String(value || ''))
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }
  return parsed.toISOString()
}

export const mapBotVisitorToAdminVisitor = (item = {}) => {
  const firstVisitIso = toIsoDate(item.first_visit_date || item.created_at)
  const lastContactIso = toIsoDate(item.last_attendance || item.updated_at || item.created_at)

  return {
    id: String(item.id || item.phone_number || ''),
    name: String(item.name || 'Anonymous').trim() || 'Anonymous',
    phone: String(item.phone_number || '').trim(),
    email: String(item.email || '').trim(),
    firstVisit: firstVisitIso ? firstVisitIso.slice(0, 10) : '',
    subscribed: Boolean(item.is_subscribed),
    tags: Array.isArray(item.tags) ? item.tags.map((tag) => String(tag || '').trim()).filter(Boolean) : [],
    lastContact: lastContactIso ? lastContactIso.slice(0, 10) : '',
    timezone: String(item.timezone || '').trim(),
    reminderPreferences:
      item.reminder_preferences && typeof item.reminder_preferences === 'object'
        ? item.reminder_preferences
        : {}
  }
}

export const fetchVisitors = async () => {
  const payload = await request(VISITORS_ENDPOINT)
  const visitors = Array.isArray(payload?.visitors) ? payload.visitors : []
  return visitors.map(mapBotVisitorToAdminVisitor)
}

export const createVisitorRecord = async ({ name, phoneNumber, email = '', firstVisitDate = '', tags = ['new'] } = {}) => {
  return request(VISITORS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, phoneNumber, email, firstVisitDate, tags })
  })
}

export const updateVisitorSubscriptionStatus = async (phoneNumber, isSubscribed) => {
  const safePhone = encodeURIComponent(String(phoneNumber || '').trim())
  return request(`${VISITORS_ENDPOINT}/${safePhone}/subscription`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ isSubscribed: Boolean(isSubscribed) })
  })
}
