import express from 'express'

import { getSystemStats, getRecentActivity, getVisitorEngagement } from '../services/analytics.service.js'
import { assertAdmin } from '../lib/admin-auth.js'
import { listFeedbackEntries } from '../services/feedback.repository.js'
import { listHolidayExceptions, removeHolidayException, upsertHolidayException } from '../services/holiday.repository.js'
import { listMessageTemplates, upsertMessageTemplate } from '../services/template.repository.js'
import { logger } from '../lib/logger.js'

const router = express.Router()

router.get('/stats', async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return
    const stats = await getSystemStats()
    res.json(stats)
  } catch (error) {
    logger.error('Failed to get system stats', { error: error.message })
    res.status(500).json({ error: 'Failed to get stats' })
  }
})

router.get('/activity', async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return
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
    if (!assertAdmin(req, res)) return
    const engagement = await getVisitorEngagement()
    res.json({ count: engagement.length, engagement })
  } catch (error) {
    logger.error('Failed to get engagement data', { error: error.message })
    res.status(500).json({ error: 'Failed to get engagement' })
  }
})

router.get('/templates', async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return
    const templates = await listMessageTemplates({
      channel: req.query?.channel || 'whatsapp',
      includeInactive: req.query?.includeInactive === 'true'
    })
    res.json({ count: templates.length, templates })
  } catch (error) {
    logger.error('Failed to list templates', { error: error.message })
    res.status(500).json({ error: 'Failed to list templates' })
  }
})

router.put('/templates/:templateKey', async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return
    const template = await upsertMessageTemplate({
      templateKey: req.params.templateKey,
      content: req.body?.content,
      channel: req.body?.channel || 'whatsapp',
      isActive: req.body?.isActive !== false,
      metadata: req.body?.metadata || {}
    })
    res.json({ ok: true, template })
  } catch (error) {
    logger.error('Failed to save template', { error: error.message })
    res.status(400).json({ error: error.message || 'Failed to save template' })
  }
})

router.get('/holidays', async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return
    const holidays = await listHolidayExceptions({ forceRefresh: req.query?.refresh === 'true' })
    res.json({ count: holidays.length, holidays })
  } catch (error) {
    logger.error('Failed to list holidays', { error: error.message })
    res.status(500).json({ error: 'Failed to list holidays' })
  }
})

router.put('/holidays', async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return
    const holiday = await upsertHolidayException({
      holidayDate: req.body?.holidayDate,
      holidayName: req.body?.holidayName,
      timezone: req.body?.timezone || '*',
      skipReminders: req.body?.skipReminders !== false,
      metadata: req.body?.metadata || {}
    })
    res.json({ ok: true, holiday })
  } catch (error) {
    logger.error('Failed to upsert holiday', { error: error.message })
    res.status(400).json({ error: error.message || 'Failed to upsert holiday' })
  }
})

router.delete('/holidays', async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return
    const removed = await removeHolidayException({
      holidayDate: req.body?.holidayDate,
      timezone: req.body?.timezone || '*'
    })
    res.json({ ok: removed })
  } catch (error) {
    logger.error('Failed to remove holiday', { error: error.message })
    res.status(400).json({ error: error.message || 'Failed to remove holiday' })
  }
})

router.get('/feedback', async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return
    const feedback = await listFeedbackEntries({
      phoneNumber: req.query?.phoneNumber,
      limit: req.query?.limit
    })
    res.json({ count: feedback.length, feedback })
  } catch (error) {
    logger.error('Failed to list feedback', { error: error.message })
    res.status(500).json({ error: 'Failed to list feedback' })
  }
})

export default router
