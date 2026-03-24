import { query } from '../db/connection.js'
import { hashPhoneNumber, normalizeEmail, normalizeName, normalizePhoneNumber } from './identity.service.js'

const VALID_PRIORITIES = new Set(['low', 'normal', 'urgent'])
const VALID_STATUSES = new Set(['new', 'in_progress', 'prayed', 'closed'])

export const createPrayerRequest = async (payload = {}) => {
  const requesterName = normalizeName(payload.requesterName || payload.name || '')
  const requestText = String(payload.requestText || payload.message || '').trim()
  if (!requesterName || !requestText) {
    throw new Error('requesterName and requestText are required')
  }

  const priorityRaw = String(payload.priority || 'normal').trim().toLowerCase()
  const priority = VALID_PRIORITIES.has(priorityRaw) ? priorityRaw : 'normal'
  const phoneNumber = normalizePhoneNumber(payload.phoneNumber || '')
  const email = normalizeEmail(payload.email || '')

  const result = await query(
    `
    INSERT INTO prayer_requests (
      visitor_id,
      member_profile_id,
      requester_name,
      email,
      phone_number,
      phone_hash,
      title,
      request_text,
      priority,
      status,
      is_confidential,
      source
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'new', $10, $11)
    RETURNING *
    `,
    [
      payload.visitorId || null,
      payload.memberProfileId || null,
      requesterName,
      email || null,
      phoneNumber || null,
      phoneNumber ? hashPhoneNumber(phoneNumber) : null,
      String(payload.title || '').trim() || null,
      requestText,
      priority,
      payload.isConfidential !== false,
      String(payload.source || 'web').trim() || 'web'
    ]
  )

  return result.rows[0] || null
}

export const listPrayerRequests = async ({ status, priority, includeClosed = true, limit = 200 } = {}) => {
  const values = []
  const where = ['deleted_at IS NULL']

  if (status) {
    values.push(String(status))
    where.push(`status = $${values.length}`)
  } else if (!includeClosed) {
    where.push(`status <> 'closed'`)
  }

  if (priority) {
    values.push(String(priority))
    where.push(`priority = $${values.length}`)
  }

  values.push(Math.max(1, Math.min(Number(limit) || 200, 1000)))

  const result = await query(
    `
    SELECT *
    FROM prayer_requests
    WHERE ${where.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT $${values.length}
    `,
    values
  )

  return result.rows
}

export const updatePrayerRequestStatus = async (id, payload = {}) => {
  const statusRaw = String(payload.status || '').trim().toLowerCase()
  if (!VALID_STATUSES.has(statusRaw)) {
    throw new Error('Invalid status')
  }

  const result = await query(
    `
    UPDATE prayer_requests
    SET status = $1,
        assigned_to = COALESCE($2, assigned_to),
        notes = COALESCE($3, notes),
        resolved_at = CASE WHEN $1 = 'closed' THEN COALESCE(resolved_at, now()) ELSE resolved_at END,
        updated_at = now()
    WHERE id = $4 AND deleted_at IS NULL
    RETURNING *
    `,
    [statusRaw, payload.assignedTo || null, payload.notes || null, id]
  )

  return result.rows[0] || null
}

export const softDeletePrayerRequest = async ({ id, reason = 'privacy_request', purgeAfterDays = 30 }) => {
  const result = await query(
    `
    UPDATE prayer_requests
    SET deleted_at = now(),
        deleted_reason = $1,
        purge_after = now() + make_interval(days => $2),
        updated_at = now()
    WHERE id = $3
    RETURNING *
    `,
    [String(reason || 'privacy_request'), Number(purgeAfterDays) || 30, id]
  )

  return result.rows[0] || null
}
