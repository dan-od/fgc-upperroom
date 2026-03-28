import { query } from '../db/connection.js'
import { logger } from '../lib/logger.js'
import crypto from 'node:crypto'

export const MESSAGE_TYPE_SERVICE_REMINDER = 'service_reminder'
export const MESSAGE_TYPE_EVENT_REMINDER = 'event_reminder'
export const MESSAGE_TYPE_EVENT_REMINDER_MEDIA = 'event_reminder_media'

export const MESSAGE_SUCCESS_STATUSES = Object.freeze(['sent', 'delivered', 'read', 'skipped_duplicate'])

const toFingerprint = ({ visitorId, eventId, messageText, messageType }) => {
  const seed = [
    String(visitorId || ''),
    String(eventId || ''),
    String(messageType || 'text'),
    String(messageText || '').trim().toLowerCase().replace(/\s+/g, ' ').slice(0, 280)
  ].join('|')

  if (!seed.replace(/\|/g, '').trim()) {
    return null
  }

  return crypto.createHash('sha256').update(seed).digest('hex')
}

export const listVisitorIdsWithMessageDispatch = async ({
  messageTypes = [],
  statuses = MESSAGE_SUCCESS_STATUSES,
  startAt,
  endAt
} = {}) => {
  const normalizedTypes = Array.isArray(messageTypes)
    ? Array.from(new Set(messageTypes.map((item) => String(item || '').trim()).filter(Boolean)))
    : []
  const normalizedStatuses = Array.isArray(statuses)
    ? Array.from(new Set(statuses.map((item) => String(item || '').trim()).filter(Boolean)))
    : []

  if (normalizedTypes.length === 0 || normalizedStatuses.length === 0 || !startAt || !endAt) {
    return []
  }

  const result = await query(
    `
    SELECT DISTINCT visitor_id
    FROM messages
    WHERE visitor_id IS NOT NULL
      AND message_type = ANY($1::text[])
      AND status = ANY($2::text[])
      AND created_at >= $3::timestamptz
      AND created_at < $4::timestamptz
    `,
    [normalizedTypes, normalizedStatuses, startAt, endAt]
  )

  return result.rows.map((row) => String(row.visitor_id || '').trim()).filter(Boolean)
}

export const logMessageSent = async (data) => {
  const { jobId, visitorId, eventId, providerMessageId, providerName, messageText, messageType, status, error } = data
  const messageFingerprint = data?.messageFingerprint || toFingerprint({ visitorId, eventId, messageText, messageType })

  const result = await query(
    `
    INSERT INTO messages (job_id, visitor_id, event_id, provider_message_id, provider_name, message_type, message_fingerprint, message_text, status, error, sent_time)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, now())
    RETURNING *
    `,
    [
      jobId,
      visitorId || null,
      eventId || null,
      providerMessageId || null,
      providerName || null,
      String(messageType || 'text'),
      messageFingerprint || null,
      messageText || null,
      status || 'queued',
      error || null
    ]
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

export const hasRecentMessageFingerprint = async ({
  fingerprint,
  visitorId,
  eventId,
  messageText,
  messageType = 'text',
  withinHours = 36
} = {}) => {
  const resolvedFingerprint = fingerprint || toFingerprint({ visitorId, eventId, messageText, messageType })
  if (!resolvedFingerprint) {
    return false
  }

  const result = await query(
    `
    SELECT id
    FROM messages
    WHERE message_fingerprint = $1
      AND status IN ('sent', 'delivered', 'read')
      AND created_at >= now() - make_interval(hours => $2)
    LIMIT 1
    `,
    [resolvedFingerprint, Math.max(1, Number(withinHours) || 36)]
  )

  return result.rowCount > 0
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
