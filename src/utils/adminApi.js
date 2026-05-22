import { toApiUrl } from './appPaths'
import { roleHasPermission } from '../shared/admin-permissions'

export const ADMIN_SESSION_TOKEN_KEY = 'admin_session_token_v1'

export const getAdminSessionToken = () => {
  try {
    return String(sessionStorage.getItem(ADMIN_SESSION_TOKEN_KEY) || '').trim()
  } catch {
    return ''
  }
}

export const setAdminSessionToken = (token) => {
  const normalized = String(token || '').trim()
  if (!normalized) return
  sessionStorage.setItem(ADMIN_SESSION_TOKEN_KEY, normalized)
}

export const clearAdminSessionToken = () => {
  sessionStorage.removeItem(ADMIN_SESSION_TOKEN_KEY)
}


const request = async (path, options = {}) => {
  const token = getAdminSessionToken()
  const headers = {
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }

  const response = await fetch(toApiUrl(path), { ...options, headers })
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    const error = new Error(payload?.error || `Request failed (${response.status})`)
    error.status = response.status
    error.code = payload?.code || ''
    throw error
  }

  return payload
}

export const adminRequest = request

export const bootstrapAdminSession = async () => {
  const token = getAdminSessionToken()
  if (!token) {
    return { ok: false, user: null }
  }

  try {
    const me = await request('/api/admin/auth/me')
    return { ok: true, user: me.user || null }
  } catch {
    clearAdminSessionToken()
    return { ok: false, user: null }
  }
}

export const loginAdmin = async ({ email, password, otpCode } = {}) => {
  try {
    const payload = await request('/api/admin/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, otpCode })
    })

    if (payload?.token) {
      setAdminSessionToken(payload.token)
    }

    return { ok: true, user: payload?.user || null, otpRequired: false, message: '' }
  } catch (error) {
    const otpRequired = error?.code === 'OTP_REQUIRED'
    return { ok: false, user: null, otpRequired, message: error?.message || 'Login failed.' }
  }
}


export const logoutAdmin = async () => {
  try {
    await request('/api/admin/auth/logout', { method: 'POST' })
  } catch {
    // Always clear local token even when remote logout fails.
  }
  clearAdminSessionToken()
}

export const changeAdminPassword = async ({ currentPassword, newPassword }) => {
  return request('/api/admin/auth/change-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword, newPassword })
  })
}

export const requestAdminPasswordReset = async ({ email }) => {
  return request('/api/admin/auth/password-reset/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email })
  })
}

export const confirmAdminPasswordReset = async ({ token, newPassword }) => {
  return request('/api/admin/auth/password-reset/confirm', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, newPassword })
  })
}

export const setupAdminTwoFactor = async () => {
  return request('/api/admin/auth/2fa/setup', { method: 'POST' })
}

export const verifyAdminTwoFactor = async ({ otpCode }) => {
  return request('/api/admin/auth/2fa/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ otpCode })
  })
}

export const disableAdminTwoFactor = async ({ otpCode }) => {
  return request('/api/admin/auth/2fa/disable', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ otpCode })
  })
}

export const fetchAdminUsers = async () => {
  return request('/api/admin/users')
}

export const createAdminUser = async ({ email, name, role, password }) => {
  return request('/api/admin/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, name, role, password })
  })
}

export const updateAdminUser = async (id, payload) => {
  return request(`/api/admin/users/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload || {})
  })
}

export const deleteAdminUser = async (id) => {
  return request(`/api/admin/users/${id}`, { method: 'DELETE' })
}

export const fetchAdminAuditLog = async ({ action = '', resource = '', actorEmail = '', since = '', limit = 100, offset = 0 } = {}) => {
  const query = new URLSearchParams()
  if (action) query.set('action', String(action).trim())
  if (resource) query.set('resource', String(resource).trim())
  if (actorEmail) query.set('actorEmail', String(actorEmail).trim())
  if (since) query.set('since', String(since).trim())
  query.set('limit', String(Math.max(1, Math.min(500, Number(limit) || 100))))
  query.set('offset', String(Math.max(0, Number(offset) || 0)))
  return request(`/api/admin/audit-log?${query.toString()}`)
}

export const fetchAdminAnalytics = async ({ windowDays = 30 } = {}) => {
  const days = Number.isFinite(Number(windowDays)) ? Math.round(Number(windowDays)) : 30
  return request(`/api/admin/analytics?windowDays=${encodeURIComponent(String(days))}`)
}

export const fetchAdminGiving = async ({ status = '', fund = '', q = '', since = '', page = 1, limit = 50 } = {}) => {
  const query = new URLSearchParams()
  if (status) query.set('status', String(status).trim())
  if (fund) query.set('fund', String(fund).trim())
  if (q) query.set('q', String(q).trim())
  if (since) query.set('since', String(since).trim())
  query.set('page', String(Math.max(1, Math.round(Number(page) || 1))))
  query.set('limit', String(Math.max(1, Math.min(200, Math.round(Number(limit) || 50)))))
  return request(`/api/admin/giving?${query.toString()}`)
}

export const fetchAdminGivingByReference = async (reference) => {
  const safeReference = encodeURIComponent(String(reference || '').trim())
  return request(`/api/admin/giving/${safeReference}`)
}

export const downloadAdminGivingCsv = async ({ status = '', fund = '', q = '', since = '' } = {}) => {
  const query = new URLSearchParams()
  if (status) query.set('status', String(status).trim())
  if (fund) query.set('fund', String(fund).trim())
  if (q) query.set('q', String(q).trim())
  if (since) query.set('since', String(since).trim())

  const token = getAdminSessionToken()
  const response = await fetch(toApiUrl(`/api/admin/giving/export.csv?${query.toString()}`), {
    headers: token ? { Authorization: `Bearer ${token}` } : {}
  })

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}))
    const error = new Error(payload?.error || `Request failed (${response.status})`)
    error.status = response.status
    throw error
  }

  const content = await response.text()
  return { content, fileName: `giving-transactions-${new Date().toISOString().slice(0, 10)}.csv` }
}

export const recordAdminAudit = async ({ action, resource, details = {} }) => {
  return request('/api/admin/audit-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, resource, details })
  })
}

export const canAdmin = (role, permission) => {
  return roleHasPermission(role, permission)
}
