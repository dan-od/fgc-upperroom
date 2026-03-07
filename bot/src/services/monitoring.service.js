import { query } from '../db/connection.js'
import { logger } from '../lib/logger.js'

export const getHealthMetrics = async () => {
  try {
    const dbCheck = await query('SELECT NOW() as db_time')
    const dbHealthy = !!dbCheck.rows[0]

    const messageHealth = await query(`
      SELECT 
        COUNT(*) FILTER (WHERE status = 'failed' AND sent_time >= NOW() - INTERVAL '1 hour') as recent_failures,
        COUNT(*) FILTER (WHERE status = 'sent' AND sent_time >= NOW() - INTERVAL '1 hour') as recent_sent,
        COUNT(*) FILTER (WHERE sent_time >= NOW() - INTERVAL '1 hour') as total_recent
      FROM messages
    `)

    const stats = messageHealth.rows[0] || {}
    const failureRate = stats.total_recent > 0 ? (parseInt(stats.recent_failures) / parseInt(stats.total_recent)) * 100 : 0

    return {
      status: dbHealthy && failureRate < 10 ? 'healthy' : failureRate < 50 ? 'degraded' : 'unhealthy',
      database: {
        connected: dbHealthy,
        timestamp: dbCheck.rows[0]?.db_time
      },
      messages: {
        recentSent: parseInt(stats.recent_sent || 0),
        recentFailures: parseInt(stats.recent_failures || 0),
        failureRate: failureRate.toFixed(2) + '%'
      },
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logger.error('Health check failed', { error: error.message })
    return {
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    }
  }
}

export const checkAlertThresholds = async () => {
  const alerts = []

  try {
    const failureCheck = await query(`
      SELECT COUNT(*) as count
      FROM messages
      WHERE status = 'failed' 
        AND sent_time >= NOW() - INTERVAL '15 minutes'
    `)

    const recentFailures = parseInt(failureCheck.rows[0]?.count || 0)
    if (recentFailures > 10) {
      alerts.push({
        severity: 'high',
        type: 'message_failure_spike',
        message: `${recentFailures} message failures in last 15 minutes`,
        count: recentFailures
      })
    }

    const optOutCheck = await query(`
      SELECT COUNT(*) as count
      FROM opt_outs
      WHERE created_at >= NOW() - INTERVAL '1 hour'
    `)

    const recentOptOuts = parseInt(optOutCheck.rows[0]?.count || 0)
    if (recentOptOuts > 5) {
      alerts.push({
        severity: 'medium',
        type: 'opt_out_spike',
        message: `${recentOptOuts} opt-outs in last hour`,
        count: recentOptOuts
      })
    }

    const queueBacklog = await query(`
      SELECT COUNT(*) as count
      FROM scheduled_jobs
      WHERE status = 'pending'
        AND scheduled_at < NOW()
    `)

    const pendingJobs = parseInt(queueBacklog.rows[0]?.count || 0)
    if (pendingJobs > 5) {
      alerts.push({
        severity: 'medium',
        type: 'job_backlog',
        message: `${pendingJobs} jobs overdue`,
        count: pendingJobs
      })
    }

    return {
      hasAlerts: alerts.length > 0,
      alerts,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logger.error('Alert check failed', { error: error.message })
    return {
      hasAlerts: true,
      alerts: [
        {
          severity: 'critical',
          type: 'monitoring_failure',
          message: 'Alert system check failed',
          error: error.message
        }
      ]
    }
  }
}

export const triggerWebhookAlert = async (alert, webhookUrl) => {
  if (!webhookUrl) {
    logger.warn('No webhook URL configured for alerts')
    return
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        service: 'church-whatsapp-bot',
        alert,
        timestamp: new Date().toISOString()
      })
    })

    if (!response.ok) {
      logger.error('Failed to send alert webhook', { status: response.status, alert })
    } else {
      logger.info('Alert webhook sent', { type: alert.type, severity: alert.severity })
    }
  } catch (error) {
    logger.error('Alert webhook error', { error: error.message, alert })
  }
}

export const getErrorSummary = async (hours = 24) => {
  const errorSummary = await query(
    `
    SELECT 
      error,
      COUNT(*) as count,
      MAX(sent_time) as last_occurrence
    FROM messages
    WHERE status = 'failed'
      AND error IS NOT NULL
      AND sent_time >= NOW() - INTERVAL '${hours} hours'
    GROUP BY error
    ORDER BY count DESC
    LIMIT 20
    `,
    []
  )

  return errorSummary.rows
}
