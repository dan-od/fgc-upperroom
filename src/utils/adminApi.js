const BASE_URL = String(import.meta.env.BASE_URL || '/').replace(/\/+$/, '')
const toApiUrl = (path) => `${BASE_URL}${path}`

export const ADMIN_SESSION_TOKEN_KEY = 'admin_session_token_v1'
const ADMIN_FALLBACK_PASSWORD_KEY = 'admin_password_override_v1'

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

const getFallbackLoginCredentials = () => {
  const password = String(localStorage.getItem(ADMIN_FALLBACK_PASSWORD_KEY) || '').trim() || String(import.meta.env.VITE_ADMIN_PASSWORD || '').trim()
  if (!password) return null
  return {
    email: String(import.meta.env.VITE_ADMIN_EMAIL || 'admin@upperroom.local').trim(),
    password
  }
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

export const loginAdminWithFallback = async ({ email, password, otpCode } = {}) => {
  const primary = await loginAdmin({ email, password, otpCode })
  if (primary.ok || primary.otpRequired) {
    return primary
  }

  const fallback = getFallbackLoginCredentials()
  if (!fallback) {
    return primary
  }

  if (String(email || '').trim().toLowerCase() !== fallback.email.toLowerCase()) {
    return primary
  }

  if (String(password || '').trim() !== fallback.password) {
    return primary
  }

  return {
    ok: true,
    otpRequired: false,
    user: {
      id: 'fallback-local-admin',
      name: 'Local Admin',
      email: fallback.email,
      role: 'super_admin',
      twoFactorEnabled: false
    }
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

export const fetchAdminAuditLog = async () => {
  return request('/api/admin/audit-log')
}

export const fetchAdminAnalytics = async ({ windowDays = 30 } = {}) => {
  const days = Number.isFinite(Number(windowDays)) ? Math.round(Number(windowDays)) : 30
  return request(`/api/admin/analytics?windowDays=${encodeURIComponent(String(days))}`)
}

export const recordAdminAudit = async ({ action, resource, details = {} }) => {
  return request('/api/admin/audit-log', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, resource, details })
  })
}

export const canAdmin = (role, permission) => {
  const roleName = String(role || '').toLowerCase()
  if (roleName === 'super_admin') return true

  const map = {
    editor: [
      'content:blog:write',
      'content:blog:publish',
      'content:event:read',
      'content:event:write',
      'content:event:publish',
      'content:media:read',
      'content:media:write'
    ],
    reviewer: [
      'content:blog:read',
      'content:blog:approve',
      'content:event:read',
      'content:event:approve',
      'content:media:read',
      'audit:read'
    ]
  }

  return (map[roleName] || []).includes(permission)
}
