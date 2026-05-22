export const ADMIN_SETTINGS_STORAGE_KEY = 'admin_settings_v1'
export const ADMIN_PASSWORD_OVERRIDE_KEY = 'admin_password_override_v1'
export const ADMIN_SETTINGS_UPDATED_EVENT = 'admin-settings-updated'

export const DEFAULT_ADMIN_SETTINGS = {
  siteName: 'FGC Upper Room Mgbuoba',
  siteDescription: 'Youth Church of Foursquare Gospel Church',
  contactEmail: 'info@fgcupperroom.org',
  whatsappNumber: '+234801234567',
  address: 'Mgbuoba, Port Harcourt',
  youtubeApiKey: '',
  youtubeChannelId: '',
  enableScheduler: false,
  enableNotifications: true
}

const normalizeBoolean = (value, fallback = false) => {
  if (typeof value === 'boolean') return value
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'true' || normalized === '1' || normalized === 'yes') return true
    if (normalized === 'false' || normalized === '0' || normalized === 'no') return false
  }
  return fallback
}

export const sanitizeAdminSettings = (value) => {
  const source = value && typeof value === 'object' ? value : {}

  return {
    siteName: String(source.siteName || DEFAULT_ADMIN_SETTINGS.siteName).trim(),
    siteDescription: String(source.siteDescription || DEFAULT_ADMIN_SETTINGS.siteDescription).trim(),
    contactEmail: String(source.contactEmail || DEFAULT_ADMIN_SETTINGS.contactEmail).trim(),
    whatsappNumber: String(source.whatsappNumber || DEFAULT_ADMIN_SETTINGS.whatsappNumber).trim(),
    address: String(source.address || DEFAULT_ADMIN_SETTINGS.address).trim(),
    youtubeApiKey: String(source.youtubeApiKey || '').trim(),
    youtubeChannelId: String(source.youtubeChannelId || '').trim(),
    enableScheduler: normalizeBoolean(source.enableScheduler, DEFAULT_ADMIN_SETTINGS.enableScheduler),
    enableNotifications: normalizeBoolean(source.enableNotifications, DEFAULT_ADMIN_SETTINGS.enableNotifications)
  }
}

export const readAdminSettings = () => {
  try {
    const raw = localStorage.getItem(ADMIN_SETTINGS_STORAGE_KEY)
    if (!raw) return { ...DEFAULT_ADMIN_SETTINGS }
    const parsed = JSON.parse(raw)
    return sanitizeAdminSettings(parsed)
  } catch {
    return { ...DEFAULT_ADMIN_SETTINGS }
  }
}

export const saveAdminSettings = (settings) => {
  const normalized = sanitizeAdminSettings(settings)
  localStorage.setItem(ADMIN_SETTINGS_STORAGE_KEY, JSON.stringify(normalized))
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(ADMIN_SETTINGS_UPDATED_EVENT, { detail: normalized }))
  }
  return normalized
}

export const getAdminPasswordOverride = () => {
  const value = String(localStorage.getItem(ADMIN_PASSWORD_OVERRIDE_KEY) || '').trim()
  return value || null
}

export const setAdminPasswordOverride = (password) => {
  const trimmed = String(password || '').trim()
  if (!trimmed) return false
  localStorage.setItem(ADMIN_PASSWORD_OVERRIDE_KEY, trimmed)
  return true
}

export const clearAdminPasswordOverride = () => {
  localStorage.removeItem(ADMIN_PASSWORD_OVERRIDE_KEY)
}

export const getEffectiveAdminPassword = (envPassword) => {
  const override = getAdminPasswordOverride()
  if (override) return override
  const fallback = String(envPassword || '').trim()
  return fallback || 'admin123'
}
