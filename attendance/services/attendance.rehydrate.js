import { attendanceStore } from '../store/attendance.store.js'
import { getAttendancePool } from '../db/connection.js'

export const rehydrateAttendanceStore = async () => {
  try {
    const pool = getAttendancePool()

    const sessionsResult = await pool.query(
      `SELECT session_id, service_date, code, qr_token
       FROM attendance_sessions
       WHERE service_date >= (CURRENT_DATE - INTERVAL '1 day')
       ORDER BY service_date DESC
       LIMIT 10`
    )

    for (const row of sessionsResult.rows) {
      const session = {
        id: row.session_id,
        serviceDate: row.service_date instanceof Date
          ? row.service_date.toISOString().slice(0, 10)
          : String(row.service_date).slice(0, 10),
        code: row.code,
        qrToken: row.qr_token || null,
        createdAt: new Date().toISOString(),
      }
      attendanceStore.saveSession(session.serviceDate, session)
    }

    if (sessionsResult.rows.length === 0) return

    const sessionIds = sessionsResult.rows.map((r) => r.session_id)
    const checkinsResult = await pool.query(
      `SELECT checkin_id, session_id, checkin_type, attendee_name, helper_name,
              assisted_name, phone_hash, token_hash, fingerprint_hash, ip_hash, occurred_at
       FROM attendance_checkins
       WHERE session_id = ANY($1)`,
      [sessionIds]
    )

    for (const row of checkinsResult.rows) {
      attendanceStore.addCheckin({
        id: row.checkin_id,
        sessionId: row.session_id,
        type: row.checkin_type,
        name: row.attendee_name || undefined,
        helperName: row.helper_name || undefined,
        assistedName: row.assisted_name || undefined,
        phoneHash: row.phone_hash || undefined,
        tokenHash: row.token_hash || undefined,
        fingerprintHash: row.fingerprint_hash || undefined,
        ipHash: row.ip_hash || undefined,
        normalizedName: row.attendee_name
          ? String(row.attendee_name).trim().replace(/\s+/g, ' ').toLowerCase()
          : undefined,
        createdAt: row.occurred_at ? String(row.occurred_at) : new Date().toISOString(),
      })
    }

    console.log(
      `[attendance-db] Rehydrated ${sessionsResult.rows.length} session(s), ` +
      `${checkinsResult.rows.length} check-in(s) from DB`
    )
  } catch (err) {
    console.error('[attendance-db] Rehydration failed (in-memory store will start empty):', err.message)
  }
}
