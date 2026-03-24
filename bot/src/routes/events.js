import express from 'express'

import { createEvent, getEventById, listUpcomingEvents, updateEvent, deleteEvent } from '../services/event.repository.js'
import { createOrUpdateEventRsvp, getEventRsvpSummary, listEventRsvps, softDeleteEventRsvp } from '../services/event-rsvp.repository.js'
import { listSubscribedVisitors } from '../services/visitor.repository.js'
import { assertAdmin } from '../lib/admin-auth.js'
import { sendWhatsAppMessage } from '../services/whatsapp.service.js'
import { logMessageSent } from '../services/message.repository.js'
import { logger } from '../lib/logger.js'

const router = express.Router()

router.post('/', async (req, res) => {
  try {
    const { title, description, eventDate, eventTime, location, reminderFrequency, metadata, capacityLimit, rsvpEnabled } = req.body

    if (!title || !eventDate) {
      return res.status(400).json({ error: 'title and eventDate are required' })
    }

    if (metadata !== undefined && (typeof metadata !== 'object' || Array.isArray(metadata))) {
      return res.status(400).json({ error: 'metadata must be an object when provided' })
    }

    const event = await createEvent({
      title,
      description,
      eventDate,
      eventTime,
      location,
      reminderFrequency,
      metadata,
      capacityLimit,
      rsvpEnabled
    })

    res.status(201).json(event)
  } catch (error) {
    logger.error('Failed to create event', { error: error.message })
    res.status(500).json({ error: 'Failed to create event' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const event = await getEventById(req.params.id)
    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }
    res.json(event)
  } catch (error) {
    logger.error('Failed to get event', { error: error.message })
    res.status(500).json({ error: 'Failed to get event' })
  }
})

router.post('/:id/rsvp', async (req, res) => {
  try {
    const response = await createOrUpdateEventRsvp({
      eventId: req.params.id,
      visitorId: req.body?.visitorId,
      memberProfileId: req.body?.memberProfileId,
      fullName: req.body?.fullName || req.body?.name,
      email: req.body?.email,
      phoneNumber: req.body?.phoneNumber,
      status: req.body?.status || 'going',
      notes: req.body?.notes,
      source: req.body?.source || 'web'
    })

    const statusMessage =
      response?.rsvp?.status === 'waitlist'
        ? 'Capacity reached. You were added to the waitlist.'
        : 'RSVP saved successfully.'

    res.status(201).json({
      ok: true,
      message: statusMessage,
      ...response
    })
  } catch (error) {
    logger.error('Failed to save event RSVP', { eventId: req.params.id, error: error.message })
    res.status(400).json({ error: error.message || 'Failed to save RSVP' })
  }
})

router.get('/:id/rsvps', async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return
    const rsvps = await listEventRsvps({
      eventId: req.params.id,
      status: req.query?.status,
      limit: req.query?.limit
    })
    const summary = await getEventRsvpSummary(req.params.id)
    res.json({ count: rsvps.length, summary, rsvps })
  } catch (error) {
    logger.error('Failed to list event RSVPs', { eventId: req.params.id, error: error.message })
    res.status(500).json({ error: 'Failed to list event RSVPs' })
  }
})

router.get('/:id/rsvp-summary', async (req, res) => {
  try {
    const summary = await getEventRsvpSummary(req.params.id)
    if (!summary) {
      return res.status(404).json({ error: 'Event not found' })
    }
    res.json(summary)
  } catch (error) {
    logger.error('Failed to get RSVP summary', { eventId: req.params.id, error: error.message })
    res.status(500).json({ error: 'Failed to get RSVP summary' })
  }
})

router.get('/', async (req, res) => {
  try {
    const events = await listUpcomingEvents()
    res.json({ count: events.length, events })
  } catch (error) {
    logger.error('Failed to list events', { error: error.message })
    res.status(500).json({ error: 'Failed to list events' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    if (req.body?.metadata !== undefined && (typeof req.body.metadata !== 'object' || Array.isArray(req.body.metadata))) {
      return res.status(400).json({ error: 'metadata must be an object when provided' })
    }

    const event = await updateEvent(req.params.id, req.body)
    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }

    const notifyUpdate = async () => {
      const visitors = await listSubscribedVisitors()
      if (visitors.length === 0) return

      const dateStr = event.event_date
        ? new Date(event.event_date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
        : 'TBA'
      const notifJobId = `event-update-${event.id}-${Date.now()}`

      for (const visitor of visitors) {
        const greeting = visitor.name ? `Hi ${visitor.name}! ` : ''
        const lines = [
          `${greeting}📢 Event Update from FGC Upper Room:`,
          ``,
          `*${event.title}* has been updated.`,
          ``,
          `📅 ${dateStr}`,
        ]
        if (event.event_time) lines.push(`⏰ ${event.event_time}`)
        if (event.location) lines.push(`📍 ${event.location}`)
        lines.push(``, `We'll see you there! 🙏`)
        const messageText = lines.join('\n')

        const result = await sendWhatsAppMessage({ to: visitor.phone_number, body: messageText, jobId: notifJobId })
        await logMessageSent({
          jobId: notifJobId,
          visitorId: visitor.id,
          eventId: event.id,
          providerMessageId: result.providerMessageId,
          providerName: result.provider || 'unknown',
          messageType: 'text',
          messageText,
          status: result.status || 'sent',
        }).catch(() => {})
      }

      logger.info('Event-updated notifications dispatched', { eventId: event.id, visitorCount: visitors.length })
    }

    notifyUpdate().catch(err =>
      logger.error('Failed to dispatch event-updated notifications', { eventId: event.id, error: err.message })
    )

    res.json(event)
  } catch (error) {
    logger.error('Failed to update event', { error: error.message })
    res.status(500).json({ error: 'Failed to update event' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    await deleteEvent(req.params.id)
    res.status(204).send()
  } catch (error) {
    logger.error('Failed to delete event', { error: error.message })
    res.status(500).json({ error: 'Failed to delete event' })
  }
})

router.delete('/:id/rsvps/:rsvpId', async (req, res) => {
  try {
    if (!assertAdmin(req, res)) return
    const rsvp = await softDeleteEventRsvp({
      id: req.params.rsvpId,
      reason: req.body?.reason || 'manual_delete',
      purgeAfterDays: req.body?.purgeAfterDays || 30
    })
    if (!rsvp) {
      return res.status(404).json({ error: 'RSVP not found' })
    }
    res.json({ ok: true, rsvp })
  } catch (error) {
    logger.error('Failed to delete RSVP', { eventId: req.params.id, rsvpId: req.params.rsvpId, error: error.message })
    res.status(400).json({ error: error.message || 'Failed to delete RSVP' })
  }
})

export default router
