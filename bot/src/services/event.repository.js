import { query } from '../db/connection.js'

export const createEvent = async (data) => {
  const { title, description, eventDate, eventTime, location } = data
  const reminderStartDate = new Date(new Date(eventDate).getTime() - 30 * 24 * 60 * 60 * 1000)

  const result = await query(
    `
    INSERT INTO events (title, description, event_date, event_time, reminder_start_date, location, reminder_frequency)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
    `,
    [title, description || null, eventDate, eventTime || null, reminderStartDate.toISOString().split('T')[0], location || null, 'weekly']
  )

  return result.rows[0]
}

export const getEventById = async (id) => {
  const result = await query('SELECT * FROM events WHERE id = $1', [id])
  return result.rows[0] || null
}

export const getNextUpcomingEvent = async () => {
  const result = await query(
    `SELECT * FROM events WHERE event_date >= CURRENT_DATE ORDER BY event_date ASC LIMIT 1`
  )
  return result.rows[0] || null
}

export const listUpcomingEvents = async (from = new Date()) => {
  const fromDate = from.toISOString().split('T')[0]
  const result = await query(
    `
    SELECT * FROM events 
    WHERE event_date >= $1
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
  const { title, description, eventDate, eventTime, location, reminderFrequency } = data

  const result = await query(
    `
    UPDATE events 
    SET title = COALESCE($1, title),
        description = COALESCE($2, description),
        event_date = COALESCE($3, event_date),
        event_time = COALESCE($4, event_time),
        location = COALESCE($5, location),
        reminder_frequency = COALESCE($6, reminder_frequency),
        updated_at = now()
    WHERE id = $7
    RETURNING *
    `,
    [title, description, eventDate, eventTime, location, reminderFrequency, id]
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
