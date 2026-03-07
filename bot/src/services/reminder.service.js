import { listSubscribedVisitors } from './visitor.repository.js'
import { listEventRemindersForDate } from './event.repository.js'
import { getSundayServiceTimeWAT, isFirstSunday } from '../utils/time.js'

export const getSundayServiceReminders = async () => {
  return listSubscribedVisitors()
}

export const listUpcomingEventRemindersForDate = async (date) => {
  const eventRows = await listEventRemindersForDate(date, 'weekly')
  const visitors = await listSubscribedVisitors()

  const reminders = []

  for (const event of eventRows) {
    for (const visitor of visitors) {
      reminders.push({
        visitorId: visitor.id,
        visitorName: visitor.name,
        phoneNumber: visitor.phone_number,
        eventId: event.id,
        eventTitle: event.title,
        eventDate: event.event_date,
        eventTime: event.event_time || '09:00'
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
