export const DEFAULT_APP_BASE_PATH = '/fgc-testing/'

export const normalizeBasePath = (value = DEFAULT_APP_BASE_PATH) => {
  let next = String(value || DEFAULT_APP_BASE_PATH).trim()

  if (!next) {
    return '/'
  }

  if (!next.startsWith('/')) {
    next = `/${next}`
  }

  next = next.replace(/\/{2,}/g, '/')

  if (!next.endsWith('/')) {
    next = `${next}/`
  }

  return next === '//' ? '/' : next
}

export const toBasename = (value = DEFAULT_APP_BASE_PATH) => {
  const normalized = normalizeBasePath(value)
  return normalized === '/' ? '/' : normalized.replace(/\/$/, '')
}

export const joinWithBasePath = (basePath = DEFAULT_APP_BASE_PATH, resource = '') => {
  const normalizedBase = normalizeBasePath(basePath)
  const cleanedResource = String(resource || '').trim().replace(/^\/+/, '')

  if (!cleanedResource) {
    return normalizedBase
  }

  if (normalizedBase === '/') {
    return `/${cleanedResource}`
  }

  return `${normalizedBase}${cleanedResource}`
}

export const joinUrlPrefix = (prefix = '', resource = '') => {
  const trimmedPrefix = String(prefix || '').trim().replace(/\/+$/, '')
  const cleanedResource = String(resource || '').trim().replace(/^\/+/, '')

  if (!trimmedPrefix) {
    return cleanedResource ? `/${cleanedResource}` : ''
  }

  if (!cleanedResource) {
    return trimmedPrefix
  }

  return `${trimmedPrefix}/${cleanedResource}`
}
