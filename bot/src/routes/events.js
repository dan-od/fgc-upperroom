import express from 'express'

import { createEvent, getEventById, listUpcomingEvents, updateEvent, deleteEvent } from '../services/event.repository.js'
import { logger } from '../lib/logger.js'

const router = express.Router()

router.post('/', async (req, res) => {
  try {
    const { title, description, eventDate, eventTime, location } = req.body

    if (!title || !eventDate) {
      return res.status(400).json({ error: 'title and eventDate are required' })
    }

    const event = await createEvent({
      title,
      description,
      eventDate,
      eventTime,
      location
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
    const event = await updateEvent(req.params.id, req.body)
    if (!event) {
      return res.status(404).json({ error: 'Event not found' })
    }
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

export default router
