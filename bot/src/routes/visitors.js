import express from 'express'

import { createVisitor, getVisitorByPhone, listSubscribedVisitors, updateVisitorSubscription, markDoNotContact } from '../services/visitor.repository.js'
import { logger } from '../lib/logger.js'

const router = express.Router()

router.post('/', async (req, res) => {
  try {
    const { name, phoneNumber, email, firstVisitDate, tags, timezone } = req.body

    if (!phoneNumber) {
      return res.status(400).json({ error: 'phoneNumber is required' })
    }

    const visitor = await createVisitor({
      name,
      phoneNumber,
      email,
      firstVisitDate,
      tags,
      timezone
    })

    res.status(201).json(visitor)
  } catch (error) {
    logger.error('Failed to create visitor', { error: error.message })
    res.status(500).json({ error: 'Failed to create visitor' })
  }
})

router.get('/:phoneNumber', async (req, res) => {
  try {
    const visitor = await getVisitorByPhone(req.params.phoneNumber)
    if (!visitor) {
      return res.status(404).json({ error: 'Visitor not found' })
    }
    res.json(visitor)
  } catch (error) {
    logger.error('Failed to get visitor', { error: error.message })
    res.status(500).json({ error: 'Failed to get visitor' })
  }
})

router.get('/', async (req, res) => {
  try {
    const visitors = await listSubscribedVisitors()
    res.json({ count: visitors.length, visitors })
  } catch (error) {
    logger.error('Failed to list visitors', { error: error.message })
    res.status(500).json({ error: 'Failed to list visitors' })
  }
})

router.patch('/:phoneNumber/subscription', async (req, res) => {
  try {
    const { isSubscribed } = req.body
    if (typeof isSubscribed !== 'boolean') {
      return res.status(400).json({ error: 'isSubscribed must be boolean' })
    }
    const visitor = await updateVisitorSubscription(req.params.phoneNumber, isSubscribed)
    res.json(visitor)
  } catch (error) {
    logger.error('Failed to update subscription', { error: error.message })
    res.status(500).json({ error: 'Failed to update subscription' })
  }
})

router.post('/:phoneNumber/do-not-contact', async (req, res) => {
  try {
    const { reason } = req.body
    const visitor = await markDoNotContact(req.params.phoneNumber, reason)
    res.json(visitor)
  } catch (error) {
    logger.error('Failed to mark do-not-contact', { error: error.message })
    res.status(500).json({ error: 'Failed to mark do-not-contact' })
  }
})

export default router
