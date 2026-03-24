import { query } from '../db/connection.js'

const toReminderStartDate = (eventDate) => {
  const parsed = new Date(eventDate)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return new Date(parsed.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
}

export const createEvent = async (data) => {
  const { title, description, eventDate, eventTime, location, reminderFrequency, metadata, capacityLimit, rsvpEnabled } = data
  const reminderStartDate = toReminderStartDate(eventDate)
  const derivedCapacity = capacityLimit ?? metadata?.capacity
  const normalizedCapacity =
    derivedCapacity === undefined || derivedCapacity === null || String(derivedCapacity).trim() === ''
      ? null
      : Number(derivedCapacity)
  const derivedRsvpEnabled = rsvpEnabled ?? metadata?.registrationRequired

  const result = await query(
    `
    INSERT INTO events (title, description, event_date, event_time, reminder_start_date, location, reminder_frequency, metadata, capacity_limit, rsvp_enabled)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING *
    `,
    [
      title,
      description || null,
      eventDate,
      eventTime || null,
      reminderStartDate,
      location || null,
      reminderFrequency || 'weekly',
      metadata || null,
      normalizedCapacity,
      derivedRsvpEnabled === undefined ? false : Boolean(derivedRsvpEnabled)
    ]
  )

  return result.rows[0]
}

export const getEventById = async (id) => {
  const result = await query('SELECT * FROM events WHERE id = $1 AND deleted_at IS NULL', [id])
  return result.rows[0] || null
}

export const getNextUpcomingEvent = async () => {
  const result = await query(
    `SELECT * FROM events WHERE deleted_at IS NULL AND event_date >= CURRENT_DATE ORDER BY event_date ASC LIMIT 1`
  )
  return result.rows[0] || null
}

export const listUpcomingEvents = async (from = new Date()) => {
  const fromDate = from.toISOString().split('T')[0]
  const result = await query(
    `
    SELECT * FROM events 
    WHERE deleted_at IS NULL
      AND event_date >= $1
    ORDER BY event_date ASC
    `,
    [fromDate]
  )
  return result.rows
}

export const listEventRemindersForDate = async (date, reminder_frequency = 'weekly') => {
  const dateStr = date.toISOString().split('T')[0]
  const dayOfWeek = date.getDay()

  const result = await query(
    `
    SELECT id, title, event_date, event_time, description, location
    FROM events
    WHERE reminder_start_date <= $1::date 
      AND deleted_at IS NULL
      AND event_date > $1::date
      AND reminder_frequency = $2
      AND EXTRACT(DOW FROM event_date) = $3
    ORDER BY event_date ASC
    `,
    [dateStr, reminder_frequency, dayOfWeek]
  )

  return result.rows
}

export const updateEvent = async (id, data) => {
  const { title, description, eventDate, eventTime, location, reminderFrequency, metadata, capacityLimit, rsvpEnabled } = data
  const reminderStartDate = eventDate ? toReminderStartDate(eventDate) : null
  const derivedCapacity = capacityLimit ?? metadata?.capacity
  const normalizedCapacity =
    derivedCapacity === undefined || derivedCapacity === null || String(derivedCapacity).trim() === ''
      ? null
      : Number(derivedCapacity)
  const derivedRsvpEnabled = rsvpEnabled ?? metadata?.registrationRequired

  const result = await query(
    `
    UPDATE events 
    SET title = COALESCE($1, title),
        description = COALESCE($2, description),
        event_date = COALESCE($3, event_date),
        event_time = COALESCE($4, event_time),
        location = COALESCE($5, location),
        reminder_frequency = COALESCE($6, reminder_frequency),
        reminder_start_date = COALESCE($7, reminder_start_date),
        metadata = COALESCE($8::jsonb, metadata),
        capacity_limit = COALESCE($9::integer, capacity_limit),
        rsvp_enabled = COALESCE($10::boolean, rsvp_enabled),
        updated_at = now()
    WHERE id = $11
      AND deleted_at IS NULL
    RETURNING *
    `,
    [
      title,
      description,
      eventDate,
      eventTime,
      location,
      reminderFrequency,
      reminderStartDate,
      metadata || null,
      normalizedCapacity,
      derivedRsvpEnabled === undefined ? null : Boolean(derivedRsvpEnabled),
      id
    ]
  )

  return result.rows[0]
}

export const deleteEvent = async (id) => {
  await query(
    `
    DELETE FROM messages WHERE event_id = $1
    `,
    [id]
  )

  await query('DELETE FROM events WHERE id = $1', [id])
}
