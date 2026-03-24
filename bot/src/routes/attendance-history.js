import express from 'express'

import {
  listAttendanceCheckins,
  listAttendanceSessions,
  recordAttendanceCheckin,
  upsertAttendanceSession
} from '../services/attendance-history.repository.js'
import { assertAdmin } from '../lib/admin-auth.js'
import { logger } from '../lib/logger.js'

const router = express.Router()

const getSyncSecret = () => process.env.ATTENDANCE_HISTORY_SYNC_KEY || ''

const assertSync = (req, res) => {
  const expected = getSyncSecret()
  if (!expected) return true

  const provided = req.headers['x-attendance-sync-key']
  if (provided !== expected) {
    res.status(401).json({ error: 'Attendance sync authorization failed.' })
    return false
  }
  return true
}

router.post('/session', async (req, res) => {
  try {
    if (!assertSync(req, res)) return
    const session = await upsertAttendanceSession(req.body || {})
    res.status(201).json({ ok: true, session })
  } catch (error) {
    logger.error('Failed to upsert attendance session', { error: error.message })
    res.status(400).json({ error: error.message || 'Failed to upsert attendance session' })
  }
})

router.post('/checkin', async (req, res) => {
  try {
    if (!assertSync(req, res)) return
    const checkin = await recordAttendanceCheckin(req.body || {})
    res.status(checkin ? 201 : 200).json({ ok: true, checkin, deduplicated: !checkin })
  } catch (error) {
    logger.error('Failed to store attendance checkin', { error: error.message })
    res.status(400).json({ error: error.message || 'Failed to store attendance checkin' })
  }
})

router.get('/sessions', async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return
    const sessions = await listAttendanceSessions({
      fromDate: req.query?.fromDate,
      toDate: req.query?.toDate,
      limit: req.query?.limit
    })
    res.json({ count: sessions.length, sessions })
  } catch (error) {
    logger.error('Failed to list attendance sessions', { error: error.message })
    res.status(500).json({ error: 'Failed to list attendance sessions' })
  }
})

router.get('/checkins', async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return
    const checkins = await listAttendanceCheckins({
      sessionId: req.query?.sessionId,
      limit: req.query?.limit
    })
    res.json({ count: checkins.length, checkins })
  } catch (error) {
    logger.error('Failed to list attendance checkins', { error: error.message })
    res.status(500).json({ error: 'Failed to list attendance checkins' })
  }
})

export default router
