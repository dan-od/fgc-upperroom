const BOT_API_BASE = String(import.meta.env.VITE_BOT_API_URL || '').trim().replace(/\/+$/, '')

const toBotApiUrl = (resource = '') => {
  const cleaned = String(resource || '').trim()
  if (!cleaned) {
    return BOT_API_BASE || ''
  }

  const normalized = cleaned.startsWith('/') ? cleaned : `/${cleaned}`
  return BOT_API_BASE ? `${BOT_API_BASE}${normalized}` : normalized
}

const request = async (url, options = {}) => {
  const response = await fetch(url, options)
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed (${response.status})`)
  }

  return payload
}

const buildQueryString = (params = {}) => {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    const text = String(value ?? '').trim()
    if (text) {
      query.set(key, text)
    }
  }
  return query.toString()
}

export const mapBotMessageLog = (item = {}) => {
  return {
    id: String(item.id || '').trim(),
    visitorId: String(item.visitor_id || '').trim(),
    visitorName: String(item.visitor_name || '').trim(),
    visitorPhone: String(item.visitor_phone || '').trim(),
    visitorEmail: String(item.visitor_email || '').trim(),
    eventId: String(item.event_id || '').trim(),
    eventTitle: String(item.event_title || '').trim(),
    eventDate: String(item.related_event_date || '').trim(),
    eventTime: String(item.related_event_time || '').trim(),
    providerMessageId: String(item.provider_message_id || '').trim(),
    providerName: String(item.provider_name || '').trim(),
    messageType: String(item.message_type || 'text').trim(),
    messageText: String(item.message_text || '').trim(),
    status: String(item.status || '').trim(),
    error: String(item.error || '').trim(),
    createdAt: item.created_at || '',
    sentTime: item.sent_time || ''
  }
}

export const fetchBotMessageLogs = async ({ visitorId = '', status = '', eventId = '', messageType = '', limit = 100 } = {}) => {
  const query = buildQueryString({
    visitorId,
    status,
    eventId,
    messageType,
    limit: Math.max(1, Math.min(500, Number(limit) || 100))
  })

  return request(toBotApiUrl(`/bot/api/messages${query ? `?${query}` : ''}`))
}

export const previewBotServiceReminder = async ({ name = '', serviceTime = '', isFirstSunday = false } = {}) => {
  return request(toBotApiUrl('/bot/api/preview/service'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, serviceTime, isFirstSunday: Boolean(isFirstSunday) })
  })
}

export const previewBotEventReminder = async ({
  name = '',
  eventTitle = '',
  eventDate = '',
  eventTime = '',
  registrationLink = ''
} = {}) => {
  return request(toBotApiUrl('/bot/api/preview/event'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      eventTitle,
      eventDate,
      eventTime,
      registrationLink
    })
  })
}

export const previewBotBulkService = async ({ limit = 5 } = {}) => {
  return request(toBotApiUrl('/bot/api/preview/bulk-service'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ limit: Math.max(1, Math.min(20, Number(limit) || 5)) })
  })
}

export const previewBotBulkEvent = async ({
  eventTitle = '',
  eventDate = '',
  eventTime = '',
  registrationLink = '',
  limit = 5
} = {}) => {
  return request(toBotApiUrl('/bot/api/preview/bulk-event'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventTitle,
      eventDate,
      eventTime,
      registrationLink,
      limit: Math.max(1, Math.min(20, Number(limit) || 5))
    })
  })
}

export const importBotVisitorsCsv = async (file) => {
  if (!file) {
    throw new Error('Choose a CSV file to import.')
  }

  const formData = new FormData()
  formData.append('file', file, file.name || 'visitors.csv')

  return request(toBotApiUrl('/bot/api/import-csv'), {
    method: 'POST',
    body: formData
  })
}
