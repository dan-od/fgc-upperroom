import express from 'express'

import { previewServiceReminder, previewEventReminder, previewBulkMessages } from '../services/preview.service.js'
import { listSubscribedVisitors } from '../services/visitor.repository.js'
import { buildSundayServiceContext } from '../services/reminder.service.js'
import { logger } from '../lib/logger.js'

const router = express.Router()

router.post('/preview/service', async (req, res) => {
  try {
    const { name, serviceTime, isFirstSunday } = req.body
    const preview = await previewServiceReminder({ name, serviceTime, isFirstSunday })
    res.json(preview)
  } catch (error) {
    logger.error('Failed to generate service preview', { error: error.message })
    res.status(500).json({ error: 'Failed to generate preview' })
  }
})

router.post('/preview/event', async (req, res) => {
  try {
    const { name, eventTitle, eventDate } = req.body
    const preview = await previewEventReminder({ name, eventTitle, eventDate })
    res.json(preview)
  } catch (error) {
    logger.error('Failed to generate event preview', { error: error.message })
    res.status(500).json({ error: 'Failed to generate preview' })
  }
})

router.post('/preview/bulk-service', async (req, res) => {
  try {
    const { limit } = req.body
    const visitors = await listSubscribedVisitors()
    const context = buildSundayServiceContext()

    const preview = await previewBulkMessages({
      visitors,
      context: {
        type: 'service',
        serviceTime: context.serviceTime,
        isFirstSunday: context.isFirstSunday
      },
      limit: limit || 5
    })

    res.json(preview)
  } catch (error) {
    logger.error('Failed to generate bulk service preview', { error: error.message })
    res.status(500).json({ error: 'Failed to generate bulk preview' })
  }
})

router.post('/preview/bulk-event', async (req, res) => {
  try {
    const { eventTitle, eventDate, limit } = req.body
    const visitors = await listSubscribedVisitors()

    const preview = await previewBulkMessages({
      visitors,
      context: {
        type: 'event',
        eventTitle,
        eventDate
      },
      limit: limit || 5
    })

    res.json(preview)
  } catch (error) {
    logger.error('Failed to generate bulk event preview', { error: error.message })
    res.status(500).json({ error: 'Failed to generate bulk preview' })
  }
})

export default router
