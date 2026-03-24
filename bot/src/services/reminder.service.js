import { listSubscribedVisitors, normalizeReminderPreferences } from './visitor.repository.js'
import { listUpcomingEvents } from './event.repository.js'
import { getSundayServiceTimeWAT, isFirstSunday } from '../utils/time.js'
import { env } from '../config/env.js'

const ONE_DAY_MS = 24 * 60 * 60 * 1000
const KEY_DATE_OFFSETS = new Set([30, 14, 7, 3, 1])

const toUtcMidnight = (value) => {
  const parsed = value instanceof Date ? value : new Date(value)
  return new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate()))
}

const toDateFromSqlDate = (value) => {
  const text = String(value || '').trim()
  if (!text) return null
  const parsed = new Date(`${text}T00:00:00.000Z`)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

const shouldSendForFrequency = ({ runDateUtc, eventDateUtc, frequency }) => {
  const normalizedFrequency = String(frequency || 'weekly').trim().toLowerCase()
  const daysUntilEvent = Math.round((eventDateUtc.getTime() - runDateUtc.getTime()) / ONE_DAY_MS)

  if (daysUntilEvent <= 0) {
    return false
  }

  if (normalizedFrequency === 'daily') {
    return true
  }

  if (normalizedFrequency === 'key-dates') {
    return KEY_DATE_OFFSETS.has(daysUntilEvent)
  }

  return runDateUtc.getUTCDay() === eventDateUtc.getUTCDay()
}

const hasEventSubscription = (preferences, eventId) => {
  const selectedEventIds = Array.isArray(preferences?.eventIds) ? preferences.eventIds : []
  if (selectedEventIds.length === 0) {
    return true
  }
  return selectedEventIds.includes(String(eventId || ''))
}

const toMetadata = (value) => {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return value
  }
  return {}
}

const toRegistrationLink = (event) => {
  const metadata = toMetadata(event?.metadata)
  const registrationLink = String(
    metadata.registrationLink ||
    metadata.registration_url ||
    metadata.registrationURL ||
    ''
  ).trim()

  if (/^https?:\/\//i.test(registrationLink)) {
    return registrationLink
  }

  if (registrationLink.startsWith('/')) {
    const siteBase = String(env.PUBLIC_SITE_BASE_URL || '').trim().replace(/\/+$/, '')
    if (siteBase) {
      return `${siteBase}${registrationLink}`
    }
  }

  return ''
}

const toReminderMedia = (event) => {
  const metadata = toMetadata(event?.metadata)
  const mediaUrl = String(metadata.reminderMediaUrl || metadata.imageUrl || '').trim()
  if (!/^https?:\/\//i.test(mediaUrl)) {
    return null
  }

  return {
    type: String(metadata.reminderMediaType || 'image').trim().toLowerCase(),
    url: mediaUrl,
    caption: String(metadata.reminderMediaCaption || '').trim()
  }
}

export const getSundayServiceReminders = async () => {
  const visitors = await listSubscribedVisitors()
  return visitors.filter((visitor) => {
    const preferences = normalizeReminderPreferences(visitor.reminder_preferences)
    const blockedUntil = visitor?.delivery_blocked_until ? new Date(visitor.delivery_blocked_until) : null
    const isBlocked = blockedUntil && blockedUntil > new Date()
    return preferences.serviceReminders && !isBlocked
  })
}

export const listUpcomingEventRemindersForDate = async (date) => {
  const runDateUtc = toUtcMidnight(date)
  const eventRows = await listUpcomingEvents(runDateUtc)
  const visitors = await listSubscribedVisitors()
  const reminders = []

  const candidateEvents = eventRows.filter((event) => {
    const eventDateUtc = toDateFromSqlDate(event.event_date)
    const reminderStartDateUtc = toDateFromSqlDate(event.reminder_start_date)
    if (!eventDateUtc || !reminderStartDateUtc) {
      return false
    }
    return runDateUtc >= reminderStartDateUtc && eventDateUtc > runDateUtc
  })

  if (candidateEvents.length === 0 || visitors.length === 0) {
    return reminders
  }

  for (const visitor of visitors) {
    const preferences = normalizeReminderPreferences(visitor.reminder_preferences)
    if (!preferences.eventReminders) {
      continue
    }
    const blockedUntil = visitor?.delivery_blocked_until ? new Date(visitor.delivery_blocked_until) : null
    if (blockedUntil && blockedUntil > new Date()) {
      continue
    }

    for (const event of candidateEvents) {
      const eventDateUtc = toDateFromSqlDate(event.event_date)
      if (!eventDateUtc) {
        continue
      }

      if (!hasEventSubscription(preferences, event.id)) {
        continue
      }

      if (
        !shouldSendForFrequency({
          runDateUtc,
          eventDateUtc,
          frequency: preferences.eventReminderFrequency
        })
      ) {
        continue
      }

      reminders.push({
        visitorId: visitor.id,
        visitorName: visitor.name,
        phoneNumber: visitor.phone_number,
        visitorTimezone: String(visitor.timezone || 'Africa/Lagos'),
        reminderPreferences: preferences,
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.event_date,
        eventTime: event.event_time || '09:00',
        registrationLink: toRegistrationLink(event),
        media: toReminderMedia(event)
      })
    }
  }

  return reminders
}

export const buildSundayServiceContext = (baseDate = new Date()) => {
  const nextSunday = new Date(baseDate)
  const daysUntilSunday = (7 - nextSunday.getDay()) % 7 || 7
  nextSunday.setDate(nextSunday.getDate() + daysUntilSunday)

  return {
    serviceDate: nextSunday,
    serviceTime: getSundayServiceTimeWAT(nextSunday),
    isFirstSunday: isFirstSunday(nextSunday)
  }
}
