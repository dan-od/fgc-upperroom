import { normalizeApiEndpointOverride, toApiUrl } from './appPaths'

const metricRating = (metric, value) => {
  if (metric === 'CLS') {
    if (value <= 0.1) return 'good'
    if (value <= 0.25) return 'needs-improvement'
    return 'poor'
  }

  const thresholds = {
    FCP: [1800, 3000],
    LCP: [2500, 4000],
    INP: [200, 500],
    TTFB: [800, 1800]
  }

  const [good, improve] = thresholds[metric] || [1000, 2500]
  if (value <= good) return 'good'
  if (value <= improve) return 'needs-improvement'
  return 'poor'
}

const buildEndpoint = () => {
  if (import.meta.env.VITE_RUM_ENDPOINT) {
    return normalizeApiEndpointOverride(import.meta.env.VITE_RUM_ENDPOINT)
  }

  return toApiUrl('observability/rum')
}

const sendMetric = (endpoint, metric, value) => {
  const payload = {
    metric,
    value: Number(Number(value).toFixed(metric === 'CLS' ? 4 : 2)),
    rating: metricRating(metric, value),
    page: window.location.href,
    route: `${window.location.pathname}${window.location.search}`,
    source: 'web-vitals-lite'
  }

  const body = JSON.stringify(payload)
  const beaconOk = typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }))
  if (!beaconOk) {
    fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      keepalive: true,
      body
    }).catch(() => {})
  }
}

export const trackRumEvent = ({ metric, value = 1, source = 'web-event', route, page, rating = 'good' } = {}) => {
  if (typeof window === 'undefined') return
  const enabled = String(import.meta.env.VITE_RUM_ENABLED ?? 'true').toLowerCase() !== 'false'
  if (!enabled) return

  const metricName = String(metric || '').trim()
  const numericValue = Number(value)
  if (!metricName || !Number.isFinite(numericValue)) return

  const endpoint = buildEndpoint()
  const payload = {
    metric: metricName,
    value: Number(numericValue.toFixed(2)),
    rating: String(rating || 'good').trim().toLowerCase() || 'good',
    page: String(page || window.location.href),
    route: String(route || `${window.location.pathname}${window.location.search}`),
    source: String(source || 'web-event').trim().slice(0, 40) || 'web-event'
  }

  const body = JSON.stringify(payload)
  const beaconOk = typeof navigator.sendBeacon === 'function' && navigator.sendBeacon(endpoint, new Blob([body], { type: 'application/json' }))
  if (!beaconOk) {
    fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      keepalive: true,
      body
    }).catch(() => {})
  }
}

export const initRum = () => {
  if (typeof window === 'undefined' || typeof PerformanceObserver === 'undefined') return

  const enabled = String(import.meta.env.VITE_RUM_ENABLED ?? 'true').toLowerCase() !== 'false'
  if (!enabled) return

  const endpoint = buildEndpoint()
  const sent = new Set()
  let clsValue = 0
  let lcpValue = 0
  let inpValue = 0

  const sendOnce = (metric, value) => {
    if (sent.has(metric)) return
    sent.add(metric)
    sendMetric(endpoint, metric, value)
  }

  const nav = performance.getEntriesByType('navigation')[0]
  if (nav?.responseStart) {
    sendOnce('TTFB', nav.responseStart)
  }

  try {
    const paintObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          sendOnce('FCP', entry.startTime)
        }
      }
    })
    paintObserver.observe({ type: 'paint', buffered: true })
  } catch {}

  try {
    const lcpObserver = new PerformanceObserver((entryList) => {
      const entries = entryList.getEntries()
      const last = entries[entries.length - 1]
      if (last) lcpValue = last.startTime
    })
    lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true })
  } catch {}

  try {
    const clsObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (!entry.hadRecentInput) {
          clsValue += entry.value
        }
      }
    })
    clsObserver.observe({ type: 'layout-shift', buffered: true })
  } catch {}

  try {
    const inpObserver = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.interactionId && entry.duration > inpValue) {
          inpValue = entry.duration
        }
      }
    })
    inpObserver.observe({ type: 'event', durationThreshold: 40, buffered: true })
  } catch {}

  const flush = () => {
    if (lcpValue > 0) sendOnce('LCP', lcpValue)
    if (clsValue > 0) sendOnce('CLS', clsValue)
    if (inpValue > 0) sendOnce('INP', inpValue)
  }

  addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush()
  })
  addEventListener('pagehide', flush)
}
