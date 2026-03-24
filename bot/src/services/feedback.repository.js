import { query } from '../db/connection.js'
import { normalizePhoneNumber } from './identity.service.js'

export const createFeedbackEntry = async ({
  visitorId = null,
  phoneNumber = '',
  feedbackText,
  source = 'whatsapp',
  metadata = {}
} = {}) => {
  const text = String(feedbackText || '').trim()
  if (!text) {
    throw new Error('feedbackText is required')
  }

  const result = await query(
    `
    INSERT INTO conversation_feedback (visitor_id, phone_number, feedback_text, source, metadata)
    VALUES ($1, $2, $3, $4, $5::jsonb)
    RETURNING *
    `,
    [
      visitorId || null,
      phoneNumber ? normalizePhoneNumber(phoneNumber) : null,
      text,
      String(source || 'whatsapp'),
      metadata || {}
    ]
  )

  return result.rows[0] || null
}

export const listFeedbackEntries = async ({ phoneNumber, limit = 200 } = {}) => {
  const values = []
  const where = ['1=1']

  if (phoneNumber) {
    values.push(normalizePhoneNumber(phoneNumber))
    where.push(`phone_number = $${values.length}`)
  }

  values.push(Math.max(1, Math.min(Number(limit) || 200, 1000)))

  const result = await query(
    `
    SELECT *
    FROM conversation_feedback
    WHERE ${where.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT $${values.length}
    `,
    values
  )

  return result.rows
}
