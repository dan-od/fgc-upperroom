import { query } from '../db/connection.js'

export const upsertAttendanceSession = async (session = {}) => {
  const sessionId = String(session.sessionId || '').trim()
  if (!sessionId) {
    throw new Error('sessionId is required')
  }

  const serviceDate = String(session.serviceDate || '').trim()
  if (!serviceDate) {
    throw new Error('serviceDate is required')
  }

  const result = await query(
    `
    INSERT INTO attendance_sessions (session_id, service_date, code, qr_token_hash, source_service)
    VALUES ($1, $2::date, $3, $4, $5)
    ON CONFLICT (session_id) DO UPDATE
    SET service_date = EXCLUDED.service_date,
        code = COALESCE(EXCLUDED.code, attendance_sessions.code),
        qr_token_hash = COALESCE(EXCLUDED.qr_token_hash, attendance_sessions.qr_token_hash),
        source_service = COALESCE(EXCLUDED.source_service, attendance_sessions.source_service),
        updated_at = now()
    RETURNING *
    `,
    [sessionId, serviceDate, session.code || null, session.qrTokenHash || null, session.sourceService || 'attendance-service']
  )

  return result.rows[0] || null
}

export const recordAttendanceCheckin = async (payload = {}) => {
  const checkinId = String(payload.checkinId || '').trim()
  const sessionId = String(payload.sessionId || '').trim()
  if (!checkinId || !sessionId) {
    throw new Error('checkinId and sessionId are required')
  }

  const result = await query(
    `
    INSERT INTO attendance_checkins (
      checkin_id,
      session_id,
      checkin_type,
      attendee_name,
      helper_name,
      assisted_name,
      phone_hash,
      token_hash,
      fingerprint_hash,
      ip_hash,
      source_service,
      occurred_at
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, COALESCE($12::timestamptz, now()))
    ON CONFLICT (checkin_id) DO NOTHING
    RETURNING *
    `,
    [
      checkinId,
      sessionId,
      String(payload.checkinType || 'self'),
      payload.attendeeName || null,
      payload.helperName || null,
      payload.assistedName || null,
      payload.phoneHash || null,
      payload.tokenHash || null,
      payload.fingerprintHash || null,
      payload.ipHash || null,
      payload.sourceService || 'attendance-service',
      payload.occurredAt || null
    ]
  )

  return result.rows[0] || null
}

export const listAttendanceSessions = async ({ fromDate, toDate, limit = 100 } = {}) => {
  const values = []
  const where = []

  if (fromDate) {
    values.push(String(fromDate))
    where.push(`service_date >= $${values.length}::date`)
  }

  if (toDate) {
    values.push(String(toDate))
    where.push(`service_date <= $${values.length}::date`)
  }

  values.push(Math.max(1, Math.min(Number(limit) || 100, 500)))
  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''

  const result = await query(
    `
    SELECT s.*,
      (
        SELECT COUNT(*)
        FROM attendance_checkins c
        WHERE c.session_id = s.session_id
      )::int AS checkin_count
    FROM attendance_sessions s
    ${whereClause}
    ORDER BY s.service_date DESC, s.created_at DESC
    LIMIT $${values.length}
    `,
    values
  )

  return result.rows
}

export const listAttendanceCheckins = async ({ sessionId, limit = 200 } = {}) => {
  const values = []
  const where = []

  if (sessionId) {
    values.push(String(sessionId))
    where.push(`session_id = $${values.length}`)
  }

  values.push(Math.max(1, Math.min(Number(limit) || 200, 1000)))
  const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''

  const result = await query(
    `
    SELECT *
    FROM attendance_checkins
    ${whereClause}
    ORDER BY occurred_at DESC, created_at DESC
    LIMIT $${values.length}
    `,
    values
  )

  return result.rows
}
