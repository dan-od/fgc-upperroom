const MAX_RECENT = 250

const state = {
  startedAt: Date.now(),
  http: {
    total: 0,
    errors: 0,
    slow: 0,
    recentMs: []
  },
  db: {
    total: 0,
    errors: 0,
    slow: 0,
    recentMs: []
  }
}

const pushRecent = (target, value) => {
  target.push(value)
  if (target.length > MAX_RECENT) {
    target.splice(0, target.length - MAX_RECENT)
  }
}

const percentile = (values, p) => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1))
  return sorted[idx]
}

const average = (values) => {
  if (!values.length) return 0
  return values.reduce((acc, value) => acc + value, 0) / values.length
}

export const recordHttpMetric = ({ durationMs = 0, statusCode = 200, slowThresholdMs = 1200 } = {}) => {
  state.http.total += 1
  if (statusCode >= 500) state.http.errors += 1
  if (durationMs >= slowThresholdMs) state.http.slow += 1
  pushRecent(state.http.recentMs, Number(durationMs) || 0)
}

export const recordDbMetric = ({ durationMs = 0, isError = false, slowThresholdMs = 300 } = {}) => {
  state.db.total += 1
  if (isError) state.db.errors += 1
  if (durationMs >= slowThresholdMs) state.db.slow += 1
  pushRecent(state.db.recentMs, Number(durationMs) || 0)
}

export const getTelemetrySnapshot = () => {
  return {
    uptimeSeconds: Math.floor((Date.now() - state.startedAt) / 1000),
    startedAt: new Date(state.startedAt).toISOString(),
    process: {
      rssMb: Number((process.memoryUsage().rss / 1024 / 1024).toFixed(2)),
      heapUsedMb: Number((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)),
      heapTotalMb: Number((process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2))
    },
    http: {
      total: state.http.total,
      errors: state.http.errors,
      slow: state.http.slow,
      avgMs: Number(average(state.http.recentMs).toFixed(2)),
      p95Ms: Number(percentile(state.http.recentMs, 95).toFixed(2))
    },
    db: {
      total: state.db.total,
      errors: state.db.errors,
      slow: state.db.slow,
      avgMs: Number(average(state.db.recentMs).toFixed(2)),
      p95Ms: Number(percentile(state.db.recentMs, 95).toFixed(2))
    },
    timestamp: new Date().toISOString()
  }
}

