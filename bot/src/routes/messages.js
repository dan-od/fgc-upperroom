import express from 'express'

import { getMessageLogs } from '../services/message.repository.js'
import { logger } from '../lib/logger.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const { visitorId, status, eventId } = req.query
    const logs = await getMessageLogs({ visitorId, status, eventId })
    res.json({ count: logs.length, messages: logs })
  } catch (error) {
    logger.error('Failed to get message logs', { error: error.message })
    res.status(500).json({ error: 'Failed to get message logs' })
  }
})

export default router
