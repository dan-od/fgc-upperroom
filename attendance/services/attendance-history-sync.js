const ATTENDANCE_HISTORY_API_URL = String(
  process.env.ATTENDANCE_HISTORY_API_URL || 'http://localhost:4100/bot/api/attendance-history'
).replace(/\/+$/, '')

const ATTENDANCE_HISTORY_SYNC_KEY = String(process.env.ATTENDANCE_HISTORY_SYNC_KEY || '').trim()

const withTimeout = async (promise, timeoutMs = 2500) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await promise(controller.signal)
  } finally {
    clearTimeout(timeout)
  }
}

const postJson = async (path, payload) => {
  const headers = { 'Content-Type': 'application/json' }
  if (ATTENDANCE_HISTORY_SYNC_KEY) {
    headers['x-attendance-sync-key'] = ATTENDANCE_HISTORY_SYNC_KEY
  }

  return withTimeout(async (signal) => {
    const response = await fetch(`${ATTENDANCE_HISTORY_API_URL}${path}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(`Sync failed (${response.status}) ${text}`.trim())
    }
  })
}

export const syncAttendanceSession = async (session) => {
  if (!session?.id || !session?.serviceDate) return
  try {
    await postJson('/session', {
      sessionId: session.id,
      serviceDate: session.serviceDate,
      code: session.code,
      qrTokenHash: session.qrToken ? session.qrToken.slice(0, 12) : null,
      sourceService: 'attendance-service'
    })
  } catch (error) {
    console.warn('[attendance-sync] Failed to sync session:', error.message)
  }
}

export const syncAttendanceCheckin = async (payload = {}) => {
  if (!payload?.id || !payload?.sessionId) return
  try {
    await postJson('/checkin', {
      checkinId: payload.id,
      sessionId: payload.sessionId,
      serviceDate: payload.serviceDate || null,
      sessionCode: payload.sessionCode || null,
      qrTokenHash: payload.qrTokenHash || null,
      checkinType: payload.type || 'self',
      attendeeName: payload.name || null,
      helperName: payload.helperName || null,
      assistedName: payload.assistedName || null,
      phoneHash: payload.phoneHash || null,
      tokenHash: payload.tokenHash || null,
      fingerprintHash: payload.fingerprintHash || null,
      ipHash: payload.ipHash || null,
      sourceService: 'attendance-service',
      occurredAt: payload.createdAt || new Date().toISOString()
    })
  } catch (error) {
    console.warn('[attendance-sync] Failed to sync checkin:', error.message)
  }
}
