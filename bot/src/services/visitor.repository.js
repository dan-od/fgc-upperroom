import { query } from '../db/connection.js'
import { hashPhoneNumber, normalizeEmail, normalizeName, normalizeNameKey, normalizePhoneNumber, scoreDuplicateCandidate } from './identity.service.js'

const SUPPORTED_EVENT_REMINDER_FREQUENCIES = new Set(['daily', 'weekly', 'key-dates'])
const SUPPORTED_QUIET_WINDOW_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/
const SUPPORTED_TIMEZONE_PATTERN = /^[A-Za-z_]+(?:\/[A-Za-z0-9_\-+]+)+$/

export const DEFAULT_REMINDER_PREFERENCES = Object.freeze({
  serviceReminders: true,
  eventReminders: true,
  eventReminderFrequency: 'weekly',
  eventIds: [],
  quietHoursEnabled: true,
  quietHoursStart: '21:00',
  quietHoursEnd: '07:00',
  preferredDeliveryHour: 9
})

export const normalizeReminderPreferences = (value) => {
  const raw = value && typeof value === 'object' && !Array.isArray(value) ? value : {}
  const rawFrequency = String(raw.eventReminderFrequency || raw.frequency || DEFAULT_REMINDER_PREFERENCES.eventReminderFrequency)
    .trim()
    .toLowerCase()
  const eventReminderFrequency = SUPPORTED_EVENT_REMINDER_FREQUENCIES.has(rawFrequency)
    ? rawFrequency
    : DEFAULT_REMINDER_PREFERENCES.eventReminderFrequency
  const eventIds = Array.isArray(raw.eventIds)
    ? Array.from(new Set(raw.eventIds.map((item) => String(item || '').trim()).filter(Boolean)))
    : []
  const quietHoursStart = SUPPORTED_QUIET_WINDOW_PATTERN.test(String(raw.quietHoursStart || '').trim())
    ? String(raw.quietHoursStart).trim()
    : DEFAULT_REMINDER_PREFERENCES.quietHoursStart
  const quietHoursEnd = SUPPORTED_QUIET_WINDOW_PATTERN.test(String(raw.quietHoursEnd || '').trim())
    ? String(raw.quietHoursEnd).trim()
    : DEFAULT_REMINDER_PREFERENCES.quietHoursEnd
  const preferredHour = Number(raw.preferredDeliveryHour)
  const preferredDeliveryHour =
    Number.isFinite(preferredHour) && preferredHour >= 0 && preferredHour <= 23
      ? Math.trunc(preferredHour)
      : DEFAULT_REMINDER_PREFERENCES.preferredDeliveryHour

  return {
    serviceReminders:
      raw.serviceReminders === undefined ? DEFAULT_REMINDER_PREFERENCES.serviceReminders : Boolean(raw.serviceReminders),
    eventReminders: raw.eventReminders === undefined ? DEFAULT_REMINDER_PREFERENCES.eventReminders : Boolean(raw.eventReminders),
    eventReminderFrequency,
    eventIds,
    quietHoursEnabled:
      raw.quietHoursEnabled === undefined ? DEFAULT_REMINDER_PREFERENCES.quietHoursEnabled : Boolean(raw.quietHoursEnabled),
    quietHoursStart,
    quietHoursEnd,
    preferredDeliveryHour
  }
}

const withReminderPreferences = (visitor) => {
  if (!visitor) return null
  return {
    ...visitor,
    reminder_preferences: normalizeReminderPreferences(visitor.reminder_preferences)
  }
}

export const createVisitor = async (data) => {
  const { name, phoneNumber, email, firstVisitDate, tags, timezone, consentedAt, reminderPreferences } = data
  const normalizedPhone = normalizePhoneNumber(phoneNumber)
  const normalizedName = normalizeName(name || '')
  const normalizedNameKey = normalizeNameKey(normalizedName)
  const normalizedEmail = normalizeEmail(email || '')
  const normalizedTimezone = SUPPORTED_TIMEZONE_PATTERN.test(String(timezone || '').trim())
    ? String(timezone).trim()
    : 'Africa/Lagos'
  const phoneHash = hashPhoneNumber(normalizedPhone)
  const hasReminderPreferencesInput = reminderPreferences !== undefined
  const normalizedReminderPreferences = hasReminderPreferencesInput
    ? normalizeReminderPreferences(reminderPreferences)
    : DEFAULT_REMINDER_PREFERENCES
  const reminderPreferencesForUpdate = hasReminderPreferencesInput ? normalizedReminderPreferences : null

  const result = await query(
    `
    INSERT INTO visitors (name, normalized_name, phone_number, phone_hash, email, first_visit_date, is_subscribed, tags, timezone, consented_at, reminder_preferences, deleted_at, deleted_reason, purge_after)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, NULL, NULL, NULL)
    ON CONFLICT (phone_number) DO UPDATE
    SET name = COALESCE(NULLIF(EXCLUDED.name, ''), visitors.name),
        normalized_name = COALESCE(EXCLUDED.normalized_name, visitors.normalized_name),
        phone_hash = COALESCE(EXCLUDED.phone_hash, visitors.phone_hash),
        email = COALESCE(NULLIF(EXCLUDED.email, ''), visitors.email),
        reminder_preferences = COALESCE($12::jsonb, visitors.reminder_preferences),
        is_subscribed = true,
        do_not_contact = false,
        deleted_at = NULL,
        deleted_reason = NULL,
        purge_after = NULL,
        updated_at = now()
    RETURNING *
    `,
    [
      normalizedName || null,
      normalizedNameKey || null,
      normalizedPhone,
      phoneHash || null,
      normalizedEmail || null,
      firstVisitDate || null,
      true,
      tags || [],
      normalizedTimezone,
      consentedAt || new Date(),
      normalizedReminderPreferences,
      reminderPreferencesForUpdate
    ]
  )

  return withReminderPreferences(result.rows[0])
}

export const getVisitorByPhone = async (phoneNumber) => {
  const result = await query('SELECT * FROM visitors WHERE phone_number = $1', [normalizePhoneNumber(phoneNumber)])
  return withReminderPreferences(result.rows[0])
}

export const getVisitorById = async (id) => {
  const result = await query('SELECT * FROM visitors WHERE id = $1', [id])
  return withReminderPreferences(result.rows[0])
}

export const listSubscribedVisitors = async () => {
  const result = await query(
    'SELECT * FROM visitors WHERE is_subscribed = true AND do_not_contact = false AND deleted_at IS NULL ORDER BY created_at DESC'
  )
  return result.rows.map(withReminderPreferences)
}

export const listVisitors = async ({ subscribedOnly = false } = {}) => {
  const whereClause = subscribedOnly
    ? 'WHERE is_subscribed = true AND do_not_contact = false AND deleted_at IS NULL'
    : 'WHERE deleted_at IS NULL'

  const result = await query(
    `SELECT * FROM visitors ${whereClause} ORDER BY created_at DESC`
  )

  return result.rows.map(withReminderPreferences)
}

export const updateVisitorSubscription = async (phoneNumber, isSubscribed) => {
  const result = await query(
    'UPDATE visitors SET is_subscribed = $1, updated_at = now() WHERE phone_number = $2 AND deleted_at IS NULL RETURNING *',
    [isSubscribed, normalizePhoneNumber(phoneNumber)]
  )
  return withReminderPreferences(result.rows[0])
}

export const updateVisitorReminderPreferences = async (phoneNumber, reminderPreferences) => {
  const normalizedPhone = normalizePhoneNumber(phoneNumber)
  const normalizedPreferences = normalizeReminderPreferences(reminderPreferences)
  const result = await query(
    `
    UPDATE visitors
    SET reminder_preferences = $1::jsonb,
        updated_at = now()
    WHERE phone_number = $2
      AND deleted_at IS NULL
    RETURNING *
    `,
    [normalizedPreferences, normalizedPhone]
  )

  return withReminderPreferences(result.rows[0])
}

export const recordDeliverySuccess = async (phoneNumber) => {
  const normalizedPhone = normalizePhoneNumber(phoneNumber)
  const result = await query(
    `
    UPDATE visitors
    SET delivery_failures_count = 0,
        last_delivery_failure_at = NULL,
        delivery_blocked_until = NULL,
        updated_at = now()
    WHERE phone_number = $1
    RETURNING *
    `,
    [normalizedPhone]
  )

  return withReminderPreferences(result.rows[0])
}

export const recordDeliveryFailure = async (
  phoneNumber,
  { reason = 'provider_failure', blockAfter = 3, blockHours = 24 } = {}
) => {
  const normalizedPhone = normalizePhoneNumber(phoneNumber)
  const result = await query(
    `
    UPDATE visitors
    SET delivery_failures_count = COALESCE(delivery_failures_count, 0) + 1,
        last_delivery_failure_at = now(),
        delivery_blocked_until = CASE
          WHEN COALESCE(delivery_failures_count, 0) + 1 >= $2
            THEN now() + make_interval(hours => $3)
          ELSE delivery_blocked_until
        END,
        is_subscribed = CASE
          WHEN COALESCE(delivery_failures_count, 0) + 1 >= $2
            THEN false
          ELSE is_subscribed
        END,
        do_not_contact = CASE
          WHEN COALESCE(delivery_failures_count, 0) + 1 >= $2
            THEN true
          ELSE do_not_contact
        END,
        updated_at = now()
    WHERE phone_number = $1
    RETURNING *
    `,
    [normalizedPhone, Math.max(1, Number(blockAfter) || 3), Math.max(1, Number(blockHours) || 24)]
  )

  const visitor = withReminderPreferences(result.rows[0])
  return {
    visitor,
    blocked: Boolean(visitor?.delivery_blocked_until),
    reason
  }
}

export const getVisitorReminderPreferences = async (phoneNumber) => {
  const visitor = await getVisitorByPhone(phoneNumber)
  if (!visitor) {
    return null
  }
  return normalizeReminderPreferences(visitor.reminder_preferences)
}

export const markDoNotContact = async (phoneNumber, reason) => {
  const normalizedPhone = normalizePhoneNumber(phoneNumber)
  const result = await query(
    'UPDATE visitors SET do_not_contact = true, is_subscribed = false, updated_at = now() WHERE phone_number = $1 RETURNING *',
    [normalizedPhone]
  )

  await query(
    `
    INSERT INTO opt_outs (phone_number, reason)
    VALUES ($1, $2)
    ON CONFLICT (phone_number) DO UPDATE
    SET reason = EXCLUDED.reason
    `,
    [normalizedPhone, reason || 'marked by system']
  )

  return withReminderPreferences(result.rows[0])
}

export const recordVisitorAttendance = async (phoneNumber, attendanceDate) => {
  const result = await query('UPDATE visitors SET last_attendance = $1, updated_at = now() WHERE phone_number = $2 RETURNING *', [
    attendanceDate || new Date(),
    normalizePhoneNumber(phoneNumber)
  ])

  return withReminderPreferences(result.rows[0])
}

export const findPotentialVisitorDuplicates = async ({ name, email, phoneNumber, excludeVisitorId } = {}) => {
  const normalizedNameKey = normalizeNameKey(name || '')
  const normalizedEmail = normalizeEmail(email || '')
  const normalizedPhone = normalizePhoneNumber(phoneNumber || '')

  const params = [normalizedPhone || null, normalizedEmail || null, normalizedNameKey || null]
  const where = [
    '(($1::text IS NOT NULL AND phone_number = $1::text) OR ($2::text IS NOT NULL AND email = $2::text) OR ($3::text IS NOT NULL AND normalized_name = $3::text))'
  ]

  if (excludeVisitorId) {
    params.push(excludeVisitorId)
    where.push(`id <> $${params.length}`)
  }

  const result = await query(
    `
    SELECT id, name, email, phone_number, created_at
    FROM visitors
    WHERE deleted_at IS NULL
      AND ${where.join(' AND ')}
    ORDER BY created_at DESC
    LIMIT 30
    `,
    params
  )

  return result.rows
    .map((candidate) => {
      const score = scoreDuplicateCandidate({
        existing: candidate,
        nameKey: normalizedNameKey,
        email: normalizedEmail,
        phone: normalizedPhone
      })
      return {
        ...candidate,
        score: score.score,
        reasons: score.reasons
      }
    })
    .filter((candidate) => candidate.score >= 70)
}

export const recordVisitorDuplicateLinks = async (primaryVisitorId, candidates = []) => {
  if (!primaryVisitorId || !Array.isArray(candidates) || candidates.length === 0) {
    return 0
  }

  let count = 0

  for (const candidate of candidates) {
    if (!candidate?.id) continue
    const reasons = Array.isArray(candidate.reasons) ? candidate.reasons : []
    const ruleCode = reasons.length > 0 ? reasons.join('+') : 'manual_review'
    const confidence = Number(candidate.score) || 50

    await query(
      `
      INSERT INTO visitor_duplicates (primary_visitor_id, duplicate_visitor_id, rule_code, confidence, details)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (primary_visitor_id, duplicate_visitor_id, rule_code) DO UPDATE
      SET confidence = EXCLUDED.confidence,
          details = EXCLUDED.details
      `,
      [primaryVisitorId, candidate.id, ruleCode, confidence, { reasons }]
    )
    count++
  }

  return count
}

export const listVisitorDuplicates = async ({ status = 'open', limit = 200 } = {}) => {
  const result = await query(
    `
    SELECT vd.*, pv.name AS primary_name, pv.phone_number AS primary_phone, dv.name AS duplicate_name, dv.phone_number AS duplicate_phone
    FROM visitor_duplicates vd
    LEFT JOIN visitors pv ON pv.id = vd.primary_visitor_id
    LEFT JOIN visitors dv ON dv.id = vd.duplicate_visitor_id
    WHERE ($1::text = '' OR vd.status = $1)
    ORDER BY vd.created_at DESC
    LIMIT $2
    `,
    [String(status || '').trim(), Math.max(1, Math.min(Number(limit) || 200, 1000))]
  )
  return result.rows
}

export const softDeleteVisitorById = async ({ id, reason = 'manual_soft_delete', purgeAfterDays = 90 }) => {
  const result = await query(
    `
    UPDATE visitors
    SET deleted_at = now(),
        deleted_reason = $1,
        purge_after = now() + make_interval(days => $2),
        do_not_contact = true,
        is_subscribed = false,
        updated_at = now()
    WHERE id = $3
    RETURNING *
    `,
    [String(reason || 'manual_soft_delete'), Number(purgeAfterDays) || 90, id]
  )

  return withReminderPreferences(result.rows[0])
}

export const redactVisitorById = async ({ id, reason = 'privacy_erasure', purgeAfterDays = 30 }) => {
  const result = await query(
    `
    UPDATE visitors
    SET name = 'Erased Member',
        normalized_name = NULL,
        email = NULL,
        phone_hash = NULL,
        phone_number = CONCAT('erased-', REPLACE(id::text, '-', '')),
        tags = ARRAY['erased'],
        do_not_contact = true,
        is_subscribed = false,
        privacy_redacted_at = now(),
        deleted_at = now(),
        deleted_reason = $1,
        purge_after = now() + make_interval(days => $2),
        updated_at = now()
    WHERE id = $3
    RETURNING *
    `,
    [String(reason || 'privacy_erasure'), Number(purgeAfterDays) || 30, id]
  )

  return withReminderPreferences(result.rows[0])
}
