import { query } from '../db/connection.js'

const CACHE_TTL_MS = 5 * 60 * 1000

let cachedRows = []
let cacheExpiresAt = 0

const toDateKeyForTimezone = (value, timeZone = 'UTC') => {
  const date = value instanceof Date ? value : new Date(value)
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  return formatter.format(date)
}

const loadHolidayRows = async () => {
  const result = await query(
    `
    SELECT holiday_date, holiday_name, timezone, skip_reminders, metadata
    FROM holiday_exceptions
    ORDER BY holiday_date ASC
    `
  )

  cachedRows = result.rows
  cacheExpiresAt = Date.now() + CACHE_TTL_MS
  return cachedRows
}

export const listHolidayExceptions = async ({ forceRefresh = false } = {}) => {
  if (!forceRefresh && Date.now() < cacheExpiresAt && cachedRows.length > 0) {
    return cachedRows
  }

  return loadHolidayRows()
}

export const upsertHolidayException = async ({
  holidayDate,
  holidayName,
  timezone = '*',
  skipReminders = true,
  metadata = {}
} = {}) => {
  const dateText = String(holidayDate || '').trim()
  const nameText = String(holidayName || '').trim()
  if (!dateText || !nameText) {
    throw new Error('holidayDate and holidayName are required')
  }

  const result = await query(
    `
    INSERT INTO holiday_exceptions (holiday_date, holiday_name, timezone, skip_reminders, metadata)
    VALUES ($1::date, $2, $3, $4, $5::jsonb)
    ON CONFLICT (holiday_date, timezone) DO UPDATE
    SET holiday_name = EXCLUDED.holiday_name,
        skip_reminders = EXCLUDED.skip_reminders,
        metadata = EXCLUDED.metadata
    RETURNING *
    `,
    [dateText, nameText, String(timezone || '*'), Boolean(skipReminders), metadata || {}]
  )

  await loadHolidayRows()
  return result.rows[0] || null
}

export const removeHolidayException = async ({ holidayDate, timezone = '*' } = {}) => {
  const result = await query(
    `
    DELETE FROM holiday_exceptions
    WHERE holiday_date = $1::date
      AND timezone = $2
    RETURNING holiday_date, timezone
    `,
    [String(holidayDate || '').trim(), String(timezone || '*')]
  )

  await loadHolidayRows()
  return result.rowCount > 0
}

export const getHolidayForMoment = async (value, timeZone = 'UTC') => {
  const holidays = await listHolidayExceptions()
  const dateKey = toDateKeyForTimezone(value, timeZone)

  const match = holidays.find((holiday) => {
    const holidayKey = String(holiday.holiday_date).slice(0, 10)
    if (holiday.timezone === '*') {
      return holidayKey === dateKey
    }
    return holiday.timezone === timeZone && holidayKey === dateKey
  })

  return match || null
}

export const isHolidayBlocked = async (value, timeZone = 'UTC') => {
  const holiday = await getHolidayForMoment(value, timeZone)
  return Boolean(holiday?.skip_reminders)
}
