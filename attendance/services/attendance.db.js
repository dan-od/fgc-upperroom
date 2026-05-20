import { getAttendancePool } from '../db/connection.js'
import { sha256 } from '../utils/id.js'

export const writeSessionToDb = async (session) => {
  try {
    const pool = getAttendancePool()
    await pool.query(
      `INSERT INTO attendance_sessions (session_id, service_date, code, qr_token_hash, qr_token, source_service)
       VALUES ($1, $2, $3, $4, $5, 'attendance-service')
       ON CONFLICT (session_id) DO UPDATE SET
         code = EXCLUDED.code,
         qr_token_hash = EXCLUDED.qr_token_hash,
         qr_token = EXCLUDED.qr_token,
         updated_at = now()`,
      [
        session.id,
        session.serviceDate,
        session.code,
        sha256(session.qrToken),
        session.qrToken,
      ]
    )
  } catch (err) {
    console.error('[attendance-db] Failed to write session to DB:', err.message)
  }
}

export const writeCheckinToDb = async (checkin) => {
  try {
    const pool = getAttendancePool()
    await pool.query(
      `INSERT INTO attendance_checkins
         (checkin_id, session_id, checkin_type, attendee_name, helper_name, assisted_name,
          phone_hash, token_hash, fingerprint_hash, ip_hash, source_service, occurred_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'attendance-service',$11)
       ON CONFLICT (checkin_id) DO NOTHING`,
      [
        checkin.id,
        checkin.sessionId,
        checkin.type,
        checkin.name || checkin.assistedName || null,
        checkin.helperName || null,
        checkin.assistedName || null,
        checkin.phoneHash || null,
        checkin.tokenHash || null,
        checkin.fingerprintHash || null,
        checkin.ipHash || null,
        checkin.createdAt,
      ]
    )
  } catch (err) {
    console.error('[attendance-db] Failed to write check-in to DB:', err.message)
  }
}
