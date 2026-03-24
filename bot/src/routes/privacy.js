import express from 'express'

import { eraseVisitorData, runRetentionPurge } from '../services/privacy.repository.js'
import { listVisitorDuplicates, softDeleteVisitorById } from '../services/visitor.repository.js'
import { assertAdmin } from '../lib/admin-auth.js'
import { logger } from '../lib/logger.js'

const router = express.Router()

router.get('/duplicates', async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return
    const duplicates = await listVisitorDuplicates({
      status: req.query?.status || 'open',
      limit: req.query?.limit
    })
    res.json({ count: duplicates.length, duplicates })
  } catch (error) {
    logger.error('Failed to list visitor duplicates', { error: error.message })
    res.status(500).json({ error: 'Failed to list visitor duplicates' })
  }
})

router.post('/visitors/:id/soft-delete', async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return
    const visitor = await softDeleteVisitorById({
      id: req.params.id,
      reason: req.body?.reason || 'manual_soft_delete',
      purgeAfterDays: req.body?.purgeAfterDays || 90
    })

    if (!visitor) {
      return res.status(404).json({ error: 'Visitor not found' })
    }

    res.json({ ok: true, visitor })
  } catch (error) {
    logger.error('Failed to soft-delete visitor', { error: error.message })
    res.status(400).json({ error: error.message || 'Failed to soft-delete visitor' })
  }
})

router.post('/visitors/:id/erase', async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return
    const outcome = await eraseVisitorData({
      visitorId: req.params.id,
      reason: req.body?.reason || 'privacy_erasure'
    })

    if (!outcome) {
      return res.status(404).json({ error: 'Visitor not found' })
    }

    res.json({ ok: true, ...outcome })
  } catch (error) {
    logger.error('Failed to erase visitor data', { error: error.message })
    res.status(400).json({ error: error.message || 'Failed to erase visitor data' })
  }
})

router.post('/retention/run', async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return
    const outcome = await runRetentionPurge()
    res.json({ ok: true, outcome })
  } catch (error) {
    logger.error('Failed to run retention purge', { error: error.message })
    res.status(500).json({ error: 'Failed to run retention purge' })
  }
})

export default router
