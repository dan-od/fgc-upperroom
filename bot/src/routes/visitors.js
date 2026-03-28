import express from 'express'

import {
  createVisitor,
  findPotentialVisitorDuplicates,
  getVisitorByPhone,
  getVisitorReminderPreferences,
  listVisitors,
  listSubscribedVisitors,
  markDoNotContact,
  normalizeReminderPreferences,
  recordVisitorDuplicateLinks,
  updateVisitorReminderPreferences,
  updateVisitorSubscription
} from '../services/visitor.repository.js'
import { syncMemberProfileFromVisitor } from '../services/member.repository.js'
import { isValidPhoneNumber, normalizeEmail, normalizePhoneNumber } from '../services/identity.service.js'
import { sendWhatsAppMessage } from '../services/whatsapp.service.js'
import { logMessageSent } from '../services/message.repository.js'
import { renderTemplateByKey } from '../services/template.repository.js'
import { logger } from '../lib/logger.js'

const router = express.Router()

router.post('/', async (req, res) => {
  try {
    const { name, phoneNumber, email, firstVisitDate, tags, timezone, reminderPreferences } = req.body

    if (!phoneNumber) {
      return res.status(400).json({ error: 'phoneNumber is required' })
    }

    const normalizedPhone = normalizePhoneNumber(phoneNumber)
    if (!isValidPhoneNumber(normalizedPhone)) {
      return res.status(400).json({ error: 'phoneNumber must be a valid international number (E.164).' })
    }

    const normalizedEmail = normalizeEmail(email || '')
    const existingBefore = await getVisitorByPhone(normalizedPhone)

    const visitor = await createVisitor({
      name,
      phoneNumber: normalizedPhone,
      email: normalizedEmail,
      firstVisitDate,
      tags,
      timezone,
      reminderPreferences
    })

    await syncMemberProfileFromVisitor(visitor, { lifecycleState: visitor.member_state || 'active' }).catch((error) => {
      logger.warn('Failed to sync member profile from visitor', { visitorId: visitor.id, error: error.message })
    })

    const duplicates = await findPotentialVisitorDuplicates({
      name: visitor.name,
      email: visitor.email,
      phoneNumber: visitor.phone_number,
      excludeVisitorId: visitor.id
    })

    if (duplicates.length > 0) {
      await recordVisitorDuplicateLinks(visitor.id, duplicates).catch((error) => {
        logger.warn('Failed to record visitor duplicate links', { visitorId: visitor.id, error: error.message })
      })
    }

    if (!existingBefore) {
      const jobId = `welcome-${visitor.id}-${Date.now()}`
      const welcomeName = visitor.name ? `, ${visitor.name}` : ''
      const fallbackWelcomeText = `Welcome to FGC Upper Room${welcomeName}. You're now on our WhatsApp list for Sunday reminders and event updates. Reply STOP any time to unsubscribe.`
      const welcomeText = (await renderTemplateByKey('welcome_message', {
        name: visitor.name || 'there',
        nameSuffix: welcomeName
      }).catch(() => null)) || fallbackWelcomeText

      sendWhatsAppMessage({ to: visitor.phone_number, body: welcomeText, jobId })
        .then(result =>
          logMessageSent({
            jobId,
            visitorId: visitor.id,
            providerMessageId: result.providerMessageId,
            providerName: result.provider || 'unknown',
            messageType: 'text',
            messageText: welcomeText,
            status: result.status || 'sent',
          })
        )
        .catch(err => logger.error('Failed to send welcome message', { visitorId: visitor.id, error: err.message }))
    }

    res.status(201).json({
      ...visitor,
      duplicateWarnings: duplicates.map((item) => ({
        id: item.id,
        name: item.name,
        phoneNumber: item.phone_number,
        email: item.email,
        score: item.score,
        reasons: item.reasons
      })),
      duplicateRulesApplied: [
        'exact_phone',
        'exact_email',
        'name_plus_last7_phone'
      ]
    })
  } catch (error) {
    logger.error('Failed to create visitor', { error: error.message })
    res.status(500).json({ error: 'Failed to create visitor' })
  }
})

router.get('/:phoneNumber/reminder-preferences', async (req, res) => {
  try {
    const reminderPreferences = await getVisitorReminderPreferences(req.params.phoneNumber)
    if (!reminderPreferences) {
      return res.status(404).json({ error: 'Visitor not found' })
    }

    res.json({
      phoneNumber: normalizePhoneNumber(req.params.phoneNumber),
      reminderPreferences
    })
  } catch (error) {
    logger.error('Failed to read reminder preferences', { error: error.message })
    res.status(500).json({ error: 'Failed to read reminder preferences' })
  }
})

router.patch('/:phoneNumber/reminder-preferences', async (req, res) => {
  try {
    const hasPayload = req.body && typeof req.body === 'object' && !Array.isArray(req.body)
    if (!hasPayload || !('reminderPreferences' in req.body)) {
      return res.status(400).json({ error: 'reminderPreferences object is required' })
    }

    const reminderPreferences = normalizeReminderPreferences(req.body.reminderPreferences)
    const visitor = await updateVisitorReminderPreferences(req.params.phoneNumber, reminderPreferences)

    if (!visitor) {
      return res.status(404).json({ error: 'Visitor not found' })
    }

    res.json({
      ok: true,
      visitorId: visitor.id,
      phoneNumber: visitor.phone_number,
      reminderPreferences: visitor.reminder_preferences
    })
  } catch (error) {
    logger.error('Failed to update reminder preferences', { error: error.message })
    res.status(500).json({ error: 'Failed to update reminder preferences' })
  }
})

router.get('/:phoneNumber', async (req, res) => {
  try {
    const normalizedPhone = normalizePhoneNumber(req.params.phoneNumber)
    const visitor = await getVisitorByPhone(normalizedPhone)
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
    const subscribedOnly = String(req.query.subscribedOnly || '').trim().toLowerCase() === 'true'
    const visitors = subscribedOnly
      ? await listSubscribedVisitors()
      : await listVisitors()
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
