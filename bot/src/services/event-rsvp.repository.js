import { query } from '../db/connection.js'
import { hashPhoneNumber, normalizeEmail, normalizeName, normalizePhoneNumber } from './identity.service.js'

const RSVP_STATUSES = new Set(['going', 'interested', 'cancelled', 'waitlist'])

const getEventCapacitySnapshot = async (eventId) => {
  const result = await query(
    `
    SELECT
      e.id,
      e.title,
      e.capacity_limit,
      e.rsvp_enabled,
      (
        SELECT COUNT(*)
        FROM event_rsvps r
        WHERE r.event_id = e.id
          AND r.deleted_at IS NULL
          AND r.status = 'going'
      )::int AS going_count
    FROM events e
    WHERE e.id = $1
    LIMIT 1
    `,
    [eventId]
  )

  return result.rows[0] || null
}

export const createOrUpdateEventRsvp = async (payload = {}) => {
  const eventId = String(payload.eventId || '').trim()
  if (!eventId) {
    throw new Error('eventId is required')
  }

  const fullName = normalizeName(payload.fullName || payload.name || '')
  const phoneNumber = normalizePhoneNumber(payload.phoneNumber || '')
  if (!fullName || !phoneNumber) {
    throw new Error('fullName and phoneNumber are required')
  }

  const statusRaw = String(payload.status || 'going').trim().toLowerCase()
  const requestedStatus = RSVP_STATUSES.has(statusRaw) ? statusRaw : 'going'
  const email = normalizeEmail(payload.email || '')
  const phoneHash = hashPhoneNumber(phoneNumber)

  const snapshot = await getEventCapacitySnapshot(eventId)
  if (!snapshot) {
    throw new Error('Event not found')
  }

  const existing = await query(
    `
    SELECT *
    FROM event_rsvps
    WHERE event_id = $1 AND phone_hash = $2
    LIMIT 1
    `,
    [eventId, phoneHash]
  )

  const existingRsvp = existing.rows[0] || null
  const alreadyGoing = existingRsvp?.status === 'going'

  let effectiveStatus = requestedStatus
  if (
    requestedStatus === 'going' &&
    snapshot.capacity_limit !== null &&
    Number(snapshot.going_count) >= Number(snapshot.capacity_limit) &&
    !alreadyGoing
  ) {
    effectiveStatus = 'waitlist'
  }

  const result = await query(
    `
    INSERT INTO event_rsvps (
      event_id,
      visitor_id,
      member_profile_id,
      full_name,
      email,
      phone_number,
      phone_hash,
      status,
      notes,
      source,
      deleted_at,
      deleted_reason,
      purge_after
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NULL, NULL, NULL)
    ON CONFLICT (event_id, phone_hash) DO UPDATE
    SET visitor_id = COALESCE(EXCLUDED.visitor_id, event_rsvps.visitor_id),
        member_profile_id = COALESCE(EXCLUDED.member_profile_id, event_rsvps.member_profile_id),
        full_name = EXCLUDED.full_name,
        email = COALESCE(EXCLUDED.email, event_rsvps.email),
        phone_number = EXCLUDED.phone_number,
        status = EXCLUDED.status,
        notes = COALESCE(EXCLUDED.notes, event_rsvps.notes),
        source = COALESCE(EXCLUDED.source, event_rsvps.source),
        deleted_at = NULL,
        deleted_reason = NULL,
        purge_after = NULL,
        updated_at = now()
    RETURNING *
    `,
    [
      eventId,
      payload.visitorId || null,
      payload.memberProfileId || null,
      fullName,
      email || null,
      phoneNumber,
      phoneHash,
      effectiveStatus,
      String(payload.notes || '').trim() || null,
      String(payload.source || 'web').trim() || 'web'
    ]
  )

  const updatedSnapshot = await getEventCapacitySnapshot(eventId)
  return {
    rsvp: result.rows[0] || null,
    capacity: updatedSnapshot
  }
}

export const listEventRsvps = async ({ eventId, status, limit = 300 } = {}) => {
  const values = [eventId]
  const where = ['event_id = $1', 'deleted_at IS NULL']

  if (status) {
    values.push(String(status))
    where.push(`status = $${values.length}`)
  }

  values.push(Math.max(1, Math.min(Number(limit) || 300, 1000)))
  const result = await query(
    `
    SELECT *
    FROM event_rsvps
    WHERE ${where.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT $${values.length}
    `,
    values
  )

  return result.rows
}

export const getEventRsvpSummary = async (eventId) => {
  const snapshot = await getEventCapacitySnapshot(eventId)
  if (!snapshot) return null

  const counts = await query(
    `
    SELECT status, COUNT(*)::int AS count
    FROM event_rsvps
    WHERE event_id = $1
      AND deleted_at IS NULL
    GROUP BY status
    `,
    [eventId]
  )

  return {
    ...snapshot,
    counts: counts.rows
  }
}

export const softDeleteEventRsvp = async ({ id, reason = 'privacy_request', purgeAfterDays = 30 }) => {
  const result = await query(
    `
    UPDATE event_rsvps
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
