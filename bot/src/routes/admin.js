import express from 'express'

import { getSystemStats, getRecentActivity, getVisitorEngagement } from '../services/analytics.service.js'
import { logger } from '../lib/logger.js'

const router = express.Router()

router.get('/stats', async (req, res) => {
  try {
    const stats = await getSystemStats()
    res.json(stats)
  } catch (error) {
    logger.error('Failed to get system stats', { error: error.message })
    res.status(500).json({ error: 'Failed to get stats' })
  }
})

router.get('/activity', async (req, res) => {
  try {
    const { limit } = req.query
    const activity = await getRecentActivity(parseInt(limit) || 50)
    res.json({ count: activity.length, activity })
  } catch (error) {
    logger.error('Failed to get recent activity', { error: error.message })
    res.status(500).json({ error: 'Failed to get activity' })
  }
})

router.get('/engagement', async (req, res) => {
  try {
    const engagement = await getVisitorEngagement()
    res.json({ count: engagement.length, engagement })
  } catch (error) {
    logger.error('Failed to get engagement data', { error: error.message })
    res.status(500).json({ error: 'Failed to get engagement' })
  }
})

export default router
