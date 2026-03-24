import express from 'express'

import { createPrayerRequest, listPrayerRequests, softDeletePrayerRequest, updatePrayerRequestStatus } from '../services/prayer.repository.js'
import { assertAdmin } from '../lib/admin-auth.js'
import { logger } from '../lib/logger.js'

const router = express.Router()

router.post('/', async (req, res) => {
  try {
    const request = await createPrayerRequest(req.body || {})
    res.status(201).json({ ok: true, request })
  } catch (error) {
    logger.error('Failed to create prayer request', { error: error.message })
    res.status(400).json({ error: error.message || 'Failed to create prayer request' })
  }
})

router.get('/', async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return

    const requests = await listPrayerRequests({
      status: req.query?.status,
      priority: req.query?.priority,
      includeClosed: req.query?.includeClosed !== 'false',
      limit: req.query?.limit
    })

    res.json({ count: requests.length, requests })
  } catch (error) {
    logger.error('Failed to list prayer requests', { error: error.message })
    res.status(500).json({ error: 'Failed to list prayer requests' })
  }
})

router.patch('/:id/status', async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return
    const request = await updatePrayerRequestStatus(req.params.id, req.body || {})
    if (!request) {
      return res.status(404).json({ error: 'Prayer request not found' })
    }
    res.json({ ok: true, request })
  } catch (error) {
    logger.error('Failed to update prayer request status', { error: error.message })
    res.status(400).json({ error: error.message || 'Failed to update prayer request status' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return
    const request = await softDeletePrayerRequest({
      id: req.params.id,
      reason: req.body?.reason || 'manual_delete',
      purgeAfterDays: req.body?.purgeAfterDays || 30
    })
    if (!request) {
      return res.status(404).json({ error: 'Prayer request not found' })
    }
    res.json({ ok: true, request })
  } catch (error) {
    logger.error('Failed to delete prayer request', { error: error.message })
    res.status(400).json({ error: error.message || 'Failed to delete prayer request' })
  }
})

export default router
