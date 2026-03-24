import { env } from '../config/env.js'
import { logger } from '../lib/logger.js'

const normalizeAlertLine = (alert = {}) => {
  const severity = String(alert.severity || 'info').toUpperCase()
  const type = String(alert.type || 'unknown')
  const message = String(alert.message || '').trim()
  return `- [${severity}] ${type}: ${message}`
}

const buildAlertPayload = ({ alerts = [], telemetry = null } = {}) => {
  const lines = [
    '[FGC Bot Alert Digest]',
    `time=${new Date().toISOString()}`,
    ...alerts.map(normalizeAlertLine)
  ]

  if (telemetry?.http || telemetry?.db) {
    lines.push(
      '',
      `http_p95_ms=${telemetry?.http?.p95Ms ?? 0}`,
      `db_p95_ms=${telemetry?.db?.p95Ms ?? 0}`,
      `http_errors=${telemetry?.http?.errors ?? 0}`,
      `db_errors=${telemetry?.db?.errors ?? 0}`
    )
  }

  return lines.join('\n')
}

const assertConfigured = () => Boolean(env.OPENCLAW_HOOK_URL && env.OPENCLAW_HOOK_TOKEN)

export const sendOpenClawAlertDigest = async ({ alerts = [], telemetry = null } = {}) => {
  if (!alerts.length || !assertConfigured()) {
    return { sent: false, reason: 'disabled_or_no_alerts' }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), Math.max(1000, env.OPENCLAW_HOOK_TIMEOUT_MS || 5000))

  try {
    const response = await fetch(env.OPENCLAW_HOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENCLAW_HOOK_TOKEN}`
      },
      body: JSON.stringify({
        text: buildAlertPayload({ alerts, telemetry }),
        mode: env.OPENCLAW_HOOK_MODE || 'now'
      }),
      signal: controller.signal
    })

    if (!response.ok) {
      const body = await response.text().catch(() => '')
      logger.warn('OpenClaw hook responded with non-OK status', {
        status: response.status,
        bodyPreview: String(body || '').slice(0, 300)
      })
      return { sent: false, status: response.status }
    }

    logger.info('OpenClaw alert digest sent', { alertCount: alerts.length })
    return { sent: true }
  } catch (error) {
    logger.warn('Failed to send OpenClaw alert digest', { error: error.message })
    return { sent: false, error: error.message }
  } finally {
    clearTimeout(timeout)
  }
}

