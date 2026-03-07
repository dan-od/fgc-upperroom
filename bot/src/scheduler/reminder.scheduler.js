import cron from 'node-cron'

import { logger } from '../lib/logger.js'
import { getReminderQueue } from '../queue/queues.js'
import { buildSundayServiceContext, listUpcomingEventRemindersForDate, getSundayServiceReminders } from '../services/reminder.service.js'
import { getNextUpcomingEvent } from '../services/event.repository.js'

// In-memory cache of the next event — refreshed every 30 minutes
let cachedNextEvent = null

export const getNextEventCache = () => cachedNextEvent

const refreshNextEventCache = async () => {
  const event = await getNextUpcomingEvent()
  cachedNextEvent = event
  if (event) {
    logger.info('Next upcoming event refreshed', {
      title: event.title,
      date: event.event_date,
      time: event.event_time
    })
  } else {
    logger.info('No upcoming events found')
  }
  return event
}

// Always-on: refresh next event cache every 30 min regardless of ENABLE_SCHEDULER
export const startEventCacheRefresh = () => {
  refreshNextEventCache()  // run immediately on startup
  cron.schedule('*/30 * * * *', refreshNextEventCache, { timezone: 'Africa/Lagos' })
  logger.info('Event cache refresh started', { intervalMinutes: 30 })
}

export const registerSchedulerJobs = () => {
  cron.schedule('0 11 * * 6', async () => {
    const context = buildSundayServiceContext(new Date())
    const visitors = await getSundayServiceReminders()
    const reminderQueue = getReminderQueue()

    await reminderQueue.add('weekly-service-reminders', {
      type: 'service',
      context,
      visitors
    })

    logger.info('Enqueued weekly Saturday 12:00 WAT service reminder batch', {
      serviceDate: context.serviceDate.toISOString(),
      serviceTime: context.serviceTime,
      isFirstSunday: context.isFirstSunday
    })
  }, { timezone: 'UTC' })

  cron.schedule('0 0 * * *', async () => {
    const today = new Date()
    const eventReminders = await listUpcomingEventRemindersForDate(today)

    if (!eventReminders.length) {
      logger.info('No event reminders due today')
      return
    }

    const reminderQueue = getReminderQueue()

    await reminderQueue.add('event-reminders', {
      type: 'event',
      reminders: eventReminders,
      runDate: today.toISOString()
    })

    logger.info('Enqueued daily event reminder batch', {
      count: eventReminders.length,
      runDate: today.toISOString()
    })
  }, { timezone: 'Africa/Lagos' })

  logger.info('Scheduler jobs registered', {
    saturdayServiceCronUtc: '0 11 * * 6',
    dailyEventPlannerWAT: '0 0 * * *'
  })
}
