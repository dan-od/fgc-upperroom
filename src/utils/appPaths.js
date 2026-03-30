import {
  DEFAULT_APP_BASE_PATH,
  joinUrlPrefix,
  joinWithBasePath,
  normalizeBasePath,
  toBasename
} from '../shared/pathing.js'

export const APP_BASE_PATH = normalizeBasePath(import.meta.env.BASE_URL || DEFAULT_APP_BASE_PATH)
export const APP_BASENAME = toBasename(APP_BASE_PATH)

const legacyApiPrefix = joinWithBasePath(APP_BASE_PATH, 'api').replace(/\/+$/, '')

const normalizeApiBase = (value = '') => {
  const raw = String(value || '/api').trim()

  if (!raw) {
    return '/api'
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(/\/+$/, '')
  }

  const normalized = `/${raw.replace(/^\/+/, '').replace(/\/+$/, '')}`
  if (normalized === legacyApiPrefix || normalized.startsWith(`${legacyApiPrefix}/`)) {
    return normalized.replace(legacyApiPrefix, '/api') || '/api'
  }

  return normalized
}

export const API_BASE_URL = normalizeApiBase(import.meta.env.VITE_API_BASE_URL || '')

export const toAppUrl = (resource = '') => joinWithBasePath(APP_BASE_PATH, resource)

export const toAssetUrl = (resource = '') => toAppUrl(resource)

export const toApiUrl = (resource = '') => {
  const cleaned = String(resource || '')
    .trim()
    .replace(/^\/+/, '')
    .replace(/^api\/+/, '')

  return cleaned ? joinUrlPrefix(API_BASE_URL, cleaned) : API_BASE_URL
}

export const normalizeApiEndpointOverride = (value = '') => {
  const raw = String(value || '').trim()
  if (!raw) {
    return toApiUrl('observability/rum')
  }

  if (/^https?:\/\//i.test(raw)) {
    return raw.replace(legacyApiPrefix, '/api')
  }

  const normalized = raw.startsWith('/') ? raw : `/${raw}`
  if (normalized === legacyApiPrefix || normalized.startsWith(`${legacyApiPrefix}/`)) {
    return normalized.replace(legacyApiPrefix, '/api')
  }

  return normalized
}
