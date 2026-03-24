import express from 'express'

import { query } from '../db/connection.js'
import {
  getMemberProfileById,
  listMemberProfiles,
  syncMemberProfileFromVisitor,
  updateMemberLifecycle
} from '../services/member.repository.js'
import { assertAdmin } from '../lib/admin-auth.js'
import { logger } from '../lib/logger.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return

    const members = await listMemberProfiles({
      lifecycleState: req.query?.lifecycleState,
      queryText: req.query?.q,
      limit: req.query?.limit
    })

    res.json({ count: members.length, members })
  } catch (error) {
    logger.error('Failed to list member profiles', { error: error.message })
    res.status(500).json({ error: 'Failed to list member profiles' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return
    const member = await getMemberProfileById(req.params.id)
    if (!member) {
      return res.status(404).json({ error: 'Member profile not found' })
    }
    res.json(member)
  } catch (error) {
    logger.error('Failed to get member profile', { error: error.message })
    res.status(500).json({ error: 'Failed to get member profile' })
  }
})

router.patch('/:id/lifecycle', async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return

    const updated = await updateMemberLifecycle(req.params.id, {
      lifecycleState: req.body?.lifecycleState,
      lifecycleReason: req.body?.lifecycleReason,
      movedTo: req.body?.movedTo,
      notes: req.body?.notes,
      tags: req.body?.tags,
      lastSeenAt: req.body?.lastSeenAt
    })

    if (!updated) {
      return res.status(404).json({ error: 'Member profile not found' })
    }

    res.json({ ok: true, member: updated })
  } catch (error) {
    logger.error('Failed to update member lifecycle', { error: error.message })
    res.status(400).json({ error: error.message || 'Failed to update member lifecycle' })
  }
})

router.post('/sync-from-visitors', async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return

    const visitorsResult = await query(
      `
      SELECT *
      FROM visitors
      WHERE deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 1000
      `
    )

    const members = []
    for (const visitor of visitorsResult.rows) {
      const member = await syncMemberProfileFromVisitor(visitor)
      if (member) members.push(member)
    }

    res.json({
      ok: true,
      synced: members.length
    })
  } catch (error) {
    logger.error('Failed to sync member profiles from visitors', { error: error.message })
    res.status(500).json({ error: 'Failed to sync member profiles from visitors' })
  }
})

export default router
