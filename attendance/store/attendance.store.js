const state = {
  sessions: new Map(),
  checkins: [],
  rateLimit: new Map()
}

export const attendanceStore = {
  getSession(serviceDate) {
    return state.sessions.get(serviceDate) || null
  },
  saveSession(serviceDate, session) {
    state.sessions.set(serviceDate, session)
    return session
  },
  addCheckin(checkin) {
    state.checkins.push(checkin)
    return checkin
  },
  listCheckinsBySession(sessionId) {
    return state.checkins.filter((entry) => entry.sessionId === sessionId)
  },
  clearCheckinsBySession(sessionId) {
    state.checkins = state.checkins.filter((entry) => entry.sessionId !== sessionId)
  },
  setRateLimit(key, value) {
    state.rateLimit.set(key, value)
  },
  getRateLimit(key) {
    return state.rateLimit.get(key) || null
  },
  addRateLimitHit(key, timestamp) {
    const existing = state.rateLimit.get(key) || []
    existing.push(timestamp)
    state.rateLimit.set(key, existing)
    return existing
  },
  getRateLimitHits(key) {
    return state.rateLimit.get(key) || []
  },
  setRateLimitHits(key, entries) {
    state.rateLimit.set(key, entries)
  }
}
