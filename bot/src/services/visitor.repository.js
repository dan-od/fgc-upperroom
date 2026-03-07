import { query } from '../db/connection.js'

export const createVisitor = async (data) => {
  const { name, phoneNumber, email, firstVisitDate, tags, timezone, consentedAt } = data

  const result = await query(
    `
    INSERT INTO visitors (name, phone_number, email, first_visit_date, is_subscribed, tags, timezone, consented_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    ON CONFLICT (phone_number) DO UPDATE
    SET name = EXCLUDED.name,
        email = EXCLUDED.email,
        is_subscribed = true,
        updated_at = now()
    RETURNING *
    `,
    [name, phoneNumber, email || null, firstVisitDate || null, true, tags || [], timezone || 'Africa/Lagos', consentedAt || new Date()]
  )

  return result.rows[0]
}

export const getVisitorByPhone = async (phoneNumber) => {
  const result = await query('SELECT * FROM visitors WHERE phone_number = $1', [phoneNumber])
  return result.rows[0] || null
}

export const listSubscribedVisitors = async () => {
  const result = await query(
    'SELECT * FROM visitors WHERE is_subscribed = true AND do_not_contact = false ORDER BY created_at DESC'
  )
  return result.rows
}

export const updateVisitorSubscription = async (phoneNumber, isSubscribed) => {
  const result = await query(
    'UPDATE visitors SET is_subscribed = $1, updated_at = now() WHERE phone_number = $2 RETURNING *',
    [isSubscribed, phoneNumber]
  )
  return result.rows[0]
}

export const markDoNotContact = async (phoneNumber, reason) => {
  const result = await query(
    'UPDATE visitors SET do_not_contact = true, updated_at = now() WHERE phone_number = $1 RETURNING *',
    [phoneNumber]
  )

  await query('INSERT INTO opt_outs (phone_number, reason) VALUES ($1, $2)', [phoneNumber, reason || 'marked by system'])

  return result.rows[0]
}

export const recordVisitorAttendance = async (phoneNumber, attendanceDate) => {
  const result = await query('UPDATE visitors SET last_attendance = $1, updated_at = now() WHERE phone_number = $2 RETURNING *', [
    attendanceDate || new Date(),
    phoneNumber
  ])

  return result.rows[0]
}
