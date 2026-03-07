import { query } from '../db/connection.js'
import { logger } from '../lib/logger.js'

export const logMessageSent = async (data) => {
  const { jobId, visitorId, eventId, providerMessageId, messageText, status, error } = data

  const result = await query(
    `
    INSERT INTO messages (job_id, visitor_id, event_id, provider_message_id, message_text, status, error, sent_time)
    VALUES ($1, $2, $3, $4, $5, $6, $7, now())
    RETURNING *
    `,
    [jobId, visitorId || null, eventId || null, providerMessageId || null, messageText || null, status || 'queued', error || null]
  )

  return result.rows[0]
}

export const getMessageById = async (id) => {
  const result = await query('SELECT * FROM messages WHERE id = $1', [id])
  return result.rows[0] || null
}

export const listMessagesByStatus = async (status, limit = 100) => {
  const result = await query(
    `
    SELECT * FROM messages 
    WHERE status = $1
    ORDER BY created_at DESC
    LIMIT $2
    `,
    [status, limit]
  )
  return result.rows
}

export const updateMessageStatus = async (providerMessageId, status, error = null) => {
  const result = await query(
    `
    UPDATE messages
    SET status = $1, error = COALESCE($2, error), sent_time = COALESCE(sent_time, now())
    WHERE provider_message_id = $3
    RETURNING *
    `,
    [status, error, providerMessageId]
  )

  return result.rows[0]
}

export const getMessageLogs = async (filters = {}) => {
  let sql = 'SELECT * FROM messages WHERE 1=1'
  const values = []
  let paramCount = 1

  if (filters.visitorId) {
    sql += ` AND visitor_id = $${paramCount}`
    values.push(filters.visitorId)
    paramCount++
  }

  if (filters.status) {
    sql += ` AND status = $${paramCount}`
    values.push(filters.status)
    paramCount++
  }

  if (filters.eventId) {
    sql += ` AND event_id = $${paramCount}`
    values.push(filters.eventId)
    paramCount++
  }

  sql += ' ORDER BY created_at DESC LIMIT 500'

  const result = await query(sql, values)
  return result.rows
}
