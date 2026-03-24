import { isHolidayBlocked } from './holiday.repository.js'
import { normalizeReminderPreferences } from './visitor.repository.js'

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000
const MAX_LOOKAHEAD_STEPS = (72 * 60) / 15 // 72 hours

const parseHourMinute = (hhmm, fallbackHour, fallbackMinute = 0) => {
  const match = String(hhmm || '').trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/)
  if (!match) {
    return { hour: fallbackHour, minute: fallbackMinute }
  }
  return { hour: Number(match[1]), minute: Number(match[2]) }
}

const getLocalParts = (date, timeZone) => {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  })

  const parts = formatter.formatToParts(date)
  const getPart = (type) => parts.find((item) => item.type === type)?.value

  const year = Number(getPart('year'))
  const month = Number(getPart('month'))
  const day = Number(getPart('day'))
  const hour = Number(getPart('hour'))
  const minute = Number(getPart('minute'))
  const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  return { year, month, day, hour, minute, dateKey }
}

const isInQuietHours = ({ hour, minute }, preferences) => {
  if (!preferences.quietHoursEnabled) {
    return false
  }

  const start = parseHourMinute(preferences.quietHoursStart, 21, 0)
  const end = parseHourMinute(preferences.quietHoursEnd, 7, 0)
  const currentMinutes = hour * 60 + minute
  const startMinutes = start.hour * 60 + start.minute
  const endMinutes = end.hour * 60 + end.minute

  if (startMinutes === endMinutes) {
    return false
  }

  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes
}

const isBeforePreferredHour = ({ hour }, preferences) => {
  const preferredHour = Number.isFinite(preferences.preferredDeliveryHour)
    ? preferences.preferredDeliveryHour
    : 9
  return hour < preferredHour
}

const canDeliverAtMoment = async ({ when, timeZone, preferences }) => {
  const local = getLocalParts(when, timeZone)
  if (await isHolidayBlocked(when, timeZone)) {
    return { ok: false, reason: 'holiday_blocked', local }
  }

  if (isInQuietHours(local, preferences)) {
    return { ok: false, reason: 'quiet_hours', local }
  }

  if (isBeforePreferredHour(local, preferences)) {
    return { ok: false, reason: 'before_preferred_hour', local }
  }

  return { ok: true, reason: 'allowed', local }
}

export const evaluateDeliveryWindow = async ({
  now = new Date(),
  visitorTimezone = 'Africa/Lagos',
  reminderPreferences = {}
} = {}) => {
  const preferences = normalizeReminderPreferences(reminderPreferences)
  const timezone = String(visitorTimezone || 'Africa/Lagos')
  const baseline = now instanceof Date ? now : new Date(now)

  const currentDecision = await canDeliverAtMoment({
    when: baseline,
    timeZone: timezone,
    preferences
  })

  if (currentDecision.ok) {
    return {
      canSendNow: true,
      reason: 'allowed',
      delayMs: 0,
      deliverAt: baseline
    }
  }

  for (let step = 1; step <= MAX_LOOKAHEAD_STEPS; step++) {
    const candidate = new Date(baseline.getTime() + step * FIFTEEN_MINUTES_MS)
    const decision = await canDeliverAtMoment({
      when: candidate,
      timeZone: timezone,
      preferences
    })
    if (decision.ok) {
      return {
        canSendNow: false,
        reason: currentDecision.reason,
        delayMs: Math.max(FIFTEEN_MINUTES_MS, candidate.getTime() - baseline.getTime()),
        deliverAt: candidate
      }
    }
  }

  return {
    canSendNow: true,
    reason: 'fallback_send',
    delayMs: 0,
    deliverAt: baseline
  }
}
