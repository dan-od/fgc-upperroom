import { query } from '../db/connection.js'
import { getVisitorById, redactVisitorById } from './visitor.repository.js'

export const eraseVisitorData = async ({ visitorId, reason = 'privacy_erasure' } = {}) => {
  if (!visitorId) {
    throw new Error('visitorId is required')
  }

  const visitor = await getVisitorById(visitorId)
  if (!visitor) {
    return null
  }

  const prayerResult = await query(
    `
    UPDATE prayer_requests
    SET deleted_at = now(),
        deleted_reason = $1,
        purge_after = now() + interval '30 days',
        updated_at = now()
    WHERE visitor_id = $2
      AND deleted_at IS NULL
    `,
    [reason, visitorId]
  )

  const rsvpResult = await query(
    `
    UPDATE event_rsvps
    SET deleted_at = now(),
        deleted_reason = $1,
        purge_after = now() + interval '30 days',
        updated_at = now()
    WHERE visitor_id = $2
      AND deleted_at IS NULL
    `,
    [reason, visitorId]
  )

  const memberResult = await query(
    `
    UPDATE member_profiles
    SET deleted_at = now(),
        deleted_reason = $1,
        purge_after = now() + interval '30 days',
        updated_at = now()
    WHERE visitor_id = $2
      AND deleted_at IS NULL
    `,
    [reason, visitorId]
  )

  const redactedVisitor = await redactVisitorById({ id: visitorId, reason, purgeAfterDays: 30 })

  return {
    visitor: redactedVisitor,
    affected: {
      prayerRequests: prayerResult.rowCount || 0,
      eventRsvps: rsvpResult.rowCount || 0,
      memberProfiles: memberResult.rowCount || 0
    }
  }
}

export const runRetentionPurge = async () => {
  const prayerPurge = await query(
    `
    DELETE FROM prayer_requests
    WHERE deleted_at IS NOT NULL
      AND purge_after IS NOT NULL
      AND purge_after <= now()
    `
  )

  const rsvpPurge = await query(
    `
    DELETE FROM event_rsvps
    WHERE deleted_at IS NOT NULL
      AND purge_after IS NOT NULL
      AND purge_after <= now()
    `
  )

  const memberPurge = await query(
    `
    DELETE FROM member_profiles
    WHERE deleted_at IS NOT NULL
      AND purge_after IS NOT NULL
      AND purge_after <= now()
    `
  )

  const duplicatePurge = await query(
    `
    DELETE FROM visitor_duplicates
    WHERE status IN ('merged', 'dismissed')
      AND resolved_at IS NOT NULL
      AND resolved_at <= (now() - interval '180 days')
    `
  )

  const attendanceCheckinPurge = await query(
    `
    DELETE FROM attendance_checkins
    WHERE created_at <= (now() - interval '730 days')
    `
  )

  const attendanceSessionPurge = await query(
    `
    DELETE FROM attendance_sessions s
    WHERE s.created_at <= (now() - interval '730 days')
      AND NOT EXISTS (
        SELECT 1
        FROM attendance_checkins c
        WHERE c.session_id = s.session_id
      )
    `
  )

  return {
    prayerRequestsPurged: prayerPurge.rowCount || 0,
    eventRsvpsPurged: rsvpPurge.rowCount || 0,
    memberProfilesPurged: memberPurge.rowCount || 0,
    visitorDuplicatesPurged: duplicatePurge.rowCount || 0,
    attendanceCheckinsPurged: attendanceCheckinPurge.rowCount || 0,
    attendanceSessionsPurged: attendanceSessionPurge.rowCount || 0
  }
}
