const fetchJsonWithTimeout = async (url, timeoutMs = 5000) => {
  const controller = new AbortController()
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await fetch(url, { signal: controller.signal })
    const data = await response.json().catch(() => ({}))
    return { ok: response.ok, status: response.status, data }
  } catch (error) {
    return { ok: false, status: 0, data: null, error: error?.message || 'Request failed' }
  } finally {
    window.clearTimeout(timeoutId)
  }
}

export const buildServerNotifications = async () => {
  const list = []

  const attendance = await fetchJsonWithTimeout('/attendance/health')
  if (!attendance.ok) {
    list.push({ id: 'server-attendance-down', source: 'server', level: 'error', title: 'Attendance service unreachable', detail: 'Attendance API is not responding from the admin panel.' })
  } else {
    list.push({ id: 'server-attendance-ok', source: 'server', level: 'success', title: 'Attendance service online', detail: 'Attendance API health check passed.' })
  }

  const botHealth = await fetchJsonWithTimeout('/bot/health')
  if (!botHealth.ok) {
    list.push({ id: 'server-bot-down', source: 'server', level: 'error', title: 'Bot service unreachable', detail: 'Bot API is unavailable to the admin panel.' })
  } else {
    list.push({ id: 'server-bot-ok', source: 'server', level: 'success', title: 'Bot service online', detail: 'Bot health endpoint is responding.' })
  }

  const monitoringHealth = await fetchJsonWithTimeout('/bot/monitoring/health')
  if (!monitoringHealth.ok) {
    list.push({ id: 'server-monitoring-health', source: 'server', level: 'warning', title: 'Monitoring health unavailable', detail: 'Detailed monitoring health endpoint did not respond normally.' })
  } else if (monitoringHealth.data?.status && monitoringHealth.data.status !== 'healthy') {
    list.push({ id: 'server-monitoring-degraded', source: 'server', level: monitoringHealth.data.status === 'unhealthy' ? 'error' : 'warning', title: `Monitoring status: ${monitoringHealth.data.status}`, detail: 'Investigate message delivery, DB, and queue metrics.' })
  }

  const alerts = await fetchJsonWithTimeout('/bot/monitoring/alerts')
  if (alerts.ok && alerts.data?.hasAlerts && Array.isArray(alerts.data.alerts) && alerts.data.alerts.length > 0) {
    list.push({ id: 'server-alerts-active', source: 'server', level: 'warning', title: `${alerts.data.alerts.length} active server alert${alerts.data.alerts.length > 1 ? 's' : ''}`, detail: 'Open bot monitoring endpoints/logs to review alert details.' })
  }

  return list
}
