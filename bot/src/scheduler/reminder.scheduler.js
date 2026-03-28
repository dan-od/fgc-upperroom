import cron from 'node-cron'

import { logger } from '../lib/logger.js'
import { getReminderQueue } from '../queue/queues.js'
import {
  buildSundayServiceContext,
  isSaturdayServiceDispatchWindow,
  listMissingSundayServiceRemindersForDate,
  listUpcomingEventRemindersForDate
} from '../services/reminder.service.js'
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

export const enqueueSaturdayServiceReminderCatchup = async ({ now = new Date(), reason = 'scheduled-audit' } = {}) => {
  const auditTime = now instanceof Date ? now : new Date(now)
  const { allVisitors, dispatchedVisitorIds, missingVisitors } = await listMissingSundayServiceRemindersForDate(auditTime)
  const context = buildSundayServiceContext(auditTime)

  logger.info('Saturday service reminder audit completed', {
    reason,
    auditAt: auditTime.toISOString(),
    totalSubscribers: allVisitors.length,
    alreadyDispatched: dispatchedVisitorIds.length,
    missingCount: missingVisitors.length,
    serviceDate: context.serviceDate.toISOString(),
    serviceTime: context.serviceTime,
    isFirstSunday: context.isFirstSunday
  })

  if (missingVisitors.length === 0) {
    return {
      queued: false,
      totalSubscribers: allVisitors.length,
      alreadyDispatched: dispatchedVisitorIds.length,
      missingCount: 0
    }
  }

  const reminderQueue = getReminderQueue()
  await reminderQueue.add('weekly-service-reminders-catchup', {
    type: 'service',
    context,
    visitors: missingVisitors,
    auditReason: reason,
    auditAt: auditTime.toISOString()
  })

  logger.info('Enqueued Saturday service reminder catch-up batch', {
    reason,
    auditAt: auditTime.toISOString(),
    queuedVisitors: missingVisitors.length,
    totalSubscribers: allVisitors.length
  })

  return {
    queued: true,
    totalSubscribers: allVisitors.length,
    alreadyDispatched: dispatchedVisitorIds.length,
    missingCount: missingVisitors.length
  }
}

export const runStartupReminderCatchup = async (now = new Date()) => {
  if (!isSaturdayServiceDispatchWindow(now)) {
    return { queued: false, skipped: true, reason: 'outside_dispatch_window' }
  }

  return enqueueSaturdayServiceReminderCatchup({
    now,
    reason: 'startup-catchup'
  })
}

export const runSaturdayServiceDispatchDeadlineAudit = async ({ now = new Date(), reason = 'deadline-audit' } = {}) => {
  const auditTime = now instanceof Date ? now : new Date(now)
  const { allVisitors, dispatchedVisitorIds, missingVisitors } = await listMissingSundayServiceRemindersForDate(auditTime)

  const payload = {
    reason,
    auditAt: auditTime.toISOString(),
    totalSubscribers: allVisitors.length,
    alreadyDispatched: dispatchedVisitorIds.length,
    missingCount: missingVisitors.length
  }

  if (missingVisitors.length > 0) {
    logger.warn('Saturday service reminder deadline audit found missing subscribers', payload)
  } else {
    logger.info('Saturday service reminder deadline audit confirms all subscribers were covered', payload)
  }

  return payload
}

export const registerSchedulerJobs = () => {
  cron.schedule('0 11 * * 6', async () => {
    await enqueueSaturdayServiceReminderCatchup({
      now: new Date(),
      reason: 'scheduled-initial'
    })
  }, { timezone: 'UTC' })

  cron.schedule('0 12-17 * * 6', async () => {
    await enqueueSaturdayServiceReminderCatchup({
      now: new Date(),
      reason: 'scheduled-hourly-audit'
    })
  }, { timezone: 'UTC' })

  cron.schedule('0 18 * * 6', async () => {
    await runSaturdayServiceDispatchDeadlineAudit({
      now: new Date(),
      reason: 'scheduled-deadline-audit'
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
    saturdayServiceAuditCronUtc: '0 12-17 * * 6',
    saturdayServiceDeadlineAuditCronUtc: '0 18 * * 6',
    dailyEventPlannerWAT: '0 0 * * *'
  })
}
