import express from 'express'

import { getHealthMetrics, checkAlertThresholds, getErrorSummary } from '../services/monitoring.service.js'
import { logger } from '../lib/logger.js'

const router = express.Router()

router.get('/health', async (req, res) => {
  try {
    const health = await getHealthMetrics()
    const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 503 : 500
    res.status(statusCode).json(health)
  } catch (error) {
    logger.error('Health endpoint error', { error: error.message })
    res.status(500).json({ status: 'error', error: error.message })
  }
})

router.get('/alerts', async (req, res) => {
  try {
    const alerts = await checkAlertThresholds()
    res.json(alerts)
  } catch (error) {
    logger.error('Alerts endpoint error', { error: error.message })
    res.status(500).json({ error: 'Failed to check alerts' })
  }
})

router.get('/errors', async (req, res) => {
  try {
    const { hours } = req.query
    const errors = await getErrorSummary(parseInt(hours) || 24)
    res.json({ count: errors.length, errors })
  } catch (error) {
    logger.error('Error summary endpoint error', { error: error.message })
    res.status(500).json({ error: 'Failed to get error summary' })
  }
})

export default router
