import { toAssetUrl } from './appPaths'

const BOT_API_BASE = import.meta.env.VITE_BOT_API_URL || ''
const EVENTS_ENDPOINT = `${BOT_API_BASE}/bot/api/events`

const DEFAULT_IMAGE = toAssetUrl('assets/media/pictures/Senior Pastor_Home.jpeg')
const DEFAULT_CONTACT = 'upperroom@fgcmgbuoba.org'
const DEFAULT_ORGANIZER = 'Youth Ministry'
const DEFAULT_LOCATION = 'FGC Mgbuoba'

export const createDefaultRegistrationMethods = () => ({
  whatsapp: {
    enabled: false,
    label: 'Register via WhatsApp',
    phone: ''
  },
  payment: {
    enabled: false,
    label: 'Pay to Register',
    url: ''
  }
})

export const normalizeRegistrationMethods = (value) => {
  const defaults = createDefaultRegistrationMethods()
  const raw = value && typeof value === 'object' ? value : {}

  return {
    whatsapp: {
      enabled: Boolean(raw?.whatsapp?.enabled),
      label: String(raw?.whatsapp?.label || defaults.whatsapp.label).trim() || defaults.whatsapp.label,
      phone: String(raw?.whatsapp?.phone || '').trim()
    },
    payment: {
      enabled: Boolean(raw?.payment?.enabled),
      label: String(raw?.payment?.label || defaults.payment.label).trim() || defaults.payment.label,
      url: String(raw?.payment?.url || '').trim()
    }
  }
}

const toMetadata = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value
  }
  return {}
}

const normalizeCategory = (value) => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
}

const toTitleCaseCategory = (value) => {
  const text = String(value || '').trim()
  if (!text) {
    return 'General'
  }

  return text
    .split(/[,\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const normalizeTimeForForm = (value) => {
  const text = String(value || '').trim()
  if (!text) {
    return ''
  }

  if (/^\d{2}:\d{2}:\d{2}$/.test(text)) {
    return text.slice(0, 5)
  }

  return text
}

const toSafeDate = (value) => {
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed
}

const toDisplayDate = (value) => {
  return toSafeDate(value).toLocaleDateString(undefined, {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })
}

const request = async (url, options = {}) => {
  const response = await fetch(url, options)
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    throw new Error(payload?.error || `Request failed (${response.status})`)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

export const fetchBotEvents = async () => {
  const payload = await request(EVENTS_ENDPOINT)
  return Array.isArray(payload?.events) ? payload.events : []
}

export const createBotEvent = async (payload) => {
  return request(EVENTS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export const updateBotEvent = async (id, payload) => {
  return request(`${EVENTS_ENDPOINT}/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
}

export const deleteBotEvent = async (id) => {
  return request(`${EVENTS_ENDPOINT}/${id}`, {
    method: 'DELETE'
  })
}

export const mapBotEventToAdminEvent = (item) => {
  const metadata = toMetadata(item?.metadata)
  const eventDate = String(item?.event_date || '').trim()
  const parsedDate = toSafeDate(eventDate || new Date().toISOString())

  return {
    id: String(item?.id || ''),
    title: String(item?.title || 'Untitled Event').trim() || 'Untitled Event',
    description: String(item?.description || '').trim(),
    date: eventDate,
    time: normalizeTimeForForm(item?.event_time),
    location: String(item?.location || metadata.location || DEFAULT_LOCATION).trim() || DEFAULT_LOCATION,
    category: normalizeCategory(metadata.category) || 'general',
    capacity: String(metadata.capacity || '').trim(),
    registrationRequired: Boolean(metadata.registrationRequired),
    registrationLink: String(metadata.registrationLink || '/contact').trim() || '/contact',
    registrationMethods: normalizeRegistrationMethods(metadata.registrationMethods),
    status: String(metadata.status || 'draft').trim() || 'draft',
    scheduledPublishAt: String(metadata.scheduledPublishAt || '').trim(),
    publishedAt: String(metadata.publishedAt || '').trim(),
    workflow: metadata.workflow && typeof metadata.workflow === 'object'
      ? metadata.workflow
      : {
          submittedAt: '',
          reviewedBy: '',
          approvedBy: '',
          rejectedReason: ''
        },
    versions: Array.isArray(metadata.versions) ? metadata.versions : [],
    whatToExpect: Array.isArray(metadata.whatToExpect)
      ? metadata.whatToExpect.map((tag) => String(tag || '').trim()).filter(Boolean)
      : [],
    imageUrl: String(metadata.imageUrl || metadata.image || '').trim(),
    price: String(metadata.price || 'Free').trim() || 'Free',
    organizer: String(metadata.organizer || DEFAULT_ORGANIZER).trim() || DEFAULT_ORGANIZER,
    contact: String(metadata.contact || DEFAULT_CONTACT).trim() || DEFAULT_CONTACT,
    startDate: parsedDate,
    createdAt: item?.created_at || null,
    updatedAt: item?.updated_at || null
  }
}

export const mapBotEventToPublicEvent = (item) => {
  const adminEvent = mapBotEventToAdminEvent(item)

  return {
    ...adminEvent,
    date: toDisplayDate(adminEvent.date || adminEvent.startDate),
    category: toTitleCaseCategory(adminEvent.category || 'general'),
    image: adminEvent.imageUrl || DEFAULT_IMAGE,
    registrationMethods: normalizeRegistrationMethods(adminEvent.registrationMethods)
  }
}

export const toBotEventPayload = (eventData) => {
  const title = String(eventData?.title || '').trim()
  const description = String(eventData?.description || '').trim()
  const eventDate = String(eventData?.date || '').trim()
  const eventTime = String(eventData?.time || '').trim()
  const location = String(eventData?.location || DEFAULT_LOCATION).trim() || DEFAULT_LOCATION
  const category = normalizeCategory(eventData?.category) || 'general'

  const whatToExpect = Array.isArray(eventData?.whatToExpect)
    ? eventData.whatToExpect.map((tag) => String(tag || '').trim()).filter(Boolean)
    : []

  const payload = {
    title,
    description,
    eventDate,
    eventTime: eventTime || null,
    location,
    metadata: {
      category,
      capacity: String(eventData?.capacity || '').trim(),
      registrationRequired: Boolean(eventData?.registrationRequired),
      registrationLink: String(eventData?.registrationLink || '/contact').trim() || '/contact',
      registrationMethods: normalizeRegistrationMethods(eventData?.registrationMethods),
      status: String(eventData?.status || 'upcoming').trim() || 'upcoming',
      scheduledPublishAt: String(eventData?.scheduledPublishAt || '').trim(),
      publishedAt: String(eventData?.publishedAt || '').trim(),
      workflow:
        eventData?.workflow && typeof eventData.workflow === 'object'
          ? eventData.workflow
          : {
              submittedAt: '',
              reviewedBy: '',
              approvedBy: '',
              rejectedReason: ''
            },
      versions: Array.isArray(eventData?.versions) ? eventData.versions : [],
      whatToExpect,
      imageUrl: String(eventData?.imageUrl || '').trim(),
      price: String(eventData?.price || 'Free').trim() || 'Free',
      organizer: String(eventData?.organizer || DEFAULT_ORGANIZER).trim() || DEFAULT_ORGANIZER,
      contact: String(eventData?.contact || DEFAULT_CONTACT).trim() || DEFAULT_CONTACT
    }
  }

  return payload
}
