const ATTENDANCE_API_BASE = import.meta.env.VITE_ATTENDANCE_API_URL || ''
const ATTENDANCE_ADMIN_KEY = import.meta.env.VITE_ATTENDANCE_ADMIN_KEY || import.meta.env.VITE_ADMIN_PASSWORD || 'admin123'

const BROWSER_TOKEN_KEY = 'upperroom_attendance_browser_token'

const getOrCreateBrowserToken = () => {
  const existing = localStorage.getItem(BROWSER_TOKEN_KEY)
  if (existing) return existing

  const generated = typeof crypto !== 'undefined' && crypto.randomUUID
    ? crypto.randomUUID().replace(/-/g, '')
    : `${Date.now()}${Math.random().toString(16).slice(2)}`

  localStorage.setItem(BROWSER_TOKEN_KEY, generated)
  return generated
}

const readJson = async (res) => {
  const data = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, data }
}

const adminHeaders = {
  'Content-Type': 'application/json',
  'x-attendance-admin-key': ATTENDANCE_ADMIN_KEY
}

export const getAttendanceCurrent = async () => {
  try {
    const res = await fetch(`${ATTENDANCE_API_BASE}/attendance/api/current`)
    const parsed = await readJson(res)
    if (!parsed.ok) return { ok: false, data: null, message: 'Unable to load attendance status.' }
    return { ok: true, data: parsed.data }
  } catch {
    return { ok: false, data: null, message: 'Unable to load attendance status.' }
  }
}

export const getAttendanceCount = async () => {
  try {
    const res = await fetch(`${ATTENDANCE_API_BASE}/attendance/api/count`)
    const parsed = await readJson(res)
    if (!parsed.ok) return { ok: false, count: 0 }
    return { ok: true, count: parsed.data.attendeeCount || 0 }
  } catch {
    return { ok: false, count: 0 }
  }
}

export const submitAttendance = async ({ mode = 'self', name, code, helperName, assistedName, assistedPhone }) => {
  try {
    const browserToken = getOrCreateBrowserToken()
    const res = await fetch(`${ATTENDANCE_API_BASE}/attendance/api/checkin`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mode,
        name,
        code,
        helperName,
        assistedName,
        assistedPhone,
        browserToken
      })
    })

    const parsed = await readJson(res)
    if (parsed.data?.browserToken) {
      localStorage.setItem(BROWSER_TOKEN_KEY, parsed.data.browserToken)
    }

    return {
      ok: parsed.ok || parsed.status === 200,
      status: parsed.status,
      data: parsed.data
    }
  } catch {
    return {
      ok: false,
      status: 0,
      data: { success: false, reason: 'network_error', message: 'Unable to submit attendance right now.' }
    }
  }
}

export const getAttendanceAdminSession = async () => {
  try {
    const res = await fetch(`${ATTENDANCE_API_BASE}/attendance/api/admin/session`, {
      headers: { 'x-attendance-admin-key': ATTENDANCE_ADMIN_KEY }
    })
    const parsed = await readJson(res)
    return { ok: parsed.ok, status: parsed.status, data: parsed.data }
  } catch {
    return {
      ok: false,
      status: 0,
      data: { success: false, message: 'Unable to load admin attendance session.' }
    }
  }
}

export const generateAttendanceAdminSession = async ({ force = false } = {}) => {
  try {
    const res = await fetch(`${ATTENDANCE_API_BASE}/attendance/api/admin/session/generate`, {
      method: 'POST',
      headers: adminHeaders,
      body: JSON.stringify({ force })
    })
    const parsed = await readJson(res)
    return { ok: parsed.ok, status: parsed.status, data: parsed.data }
  } catch {
    return {
      ok: false,
      status: 0,
      data: { success: false, message: 'Unable to generate attendance session.' }
    }
  }
}

export const getAttendanceAdminQrDownloadUrl = () => {
  const url = `${ATTENDANCE_API_BASE}/attendance/api/admin/qr.png`
  return { url, key: ATTENDANCE_ADMIN_KEY }
}
