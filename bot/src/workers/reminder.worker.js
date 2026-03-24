import { Worker } from 'bullmq'

import { env } from '../config/env.js'
import { logger } from '../lib/logger.js'
import { redisConnection } from '../queue/connection.js'
import { getReminderQueue, queueNames } from '../queue/queues.js'
import { generateServiceReminderMessage, generateEventReminderMessage } from '../services/message-generator.service.js'
import { sendWhatsAppMessage } from '../services/whatsapp.service.js'
import { hasRecentMessageFingerprint, logMessageSent } from '../services/message.repository.js'
import { evaluateDeliveryWindow } from '../services/delivery-window.service.js'
import { recordDeliveryFailure, recordDeliverySuccess } from '../services/visitor.repository.js'

const MAX_RATE_LIMIT_PER_MINUTE = Math.max(20, Number(env.REMINDER_RATE_LIMIT_MAX_PER_MINUTE) || 60)
const MIN_RATE_LIMIT_PER_MINUTE = Math.max(5, Number(env.REMINDER_RATE_LIMIT_MIN_PER_MINUTE) || 10)
const BATCH_DELAY_MS = 1000
const MAX_SEND_ATTEMPTS = 3
const RETRY_BASE_DELAY_MS = 2000
const MAX_DEFER_COUNT = 6

const adaptiveRateLimiter = {
  limitPerMinute: MAX_RATE_LIMIT_PER_MINUTE,
  count: 0,
  successStreak: 0,
  resetTime: Date.now() + 60000,
  canSend: function () {
    if (Date.now() > this.resetTime) {
      this.count = 0
      this.successStreak = 0
      this.resetTime = Date.now() + 60000
    }
    return this.count < this.limitPerMinute
  },
  consume: function () {
    this.count++
  },
  onSuccess: function () {
    this.successStreak++
    if (this.successStreak >= 25 && this.limitPerMinute < MAX_RATE_LIMIT_PER_MINUTE) {
      this.limitPerMinute = Math.min(MAX_RATE_LIMIT_PER_MINUTE, this.limitPerMinute + 5)
      this.successStreak = 0
      logger.info('Adaptive rate limit increased', { limitPerMinute: this.limitPerMinute })
    }
  },
  onRateLimited: function () {
    this.successStreak = 0
    this.limitPerMinute = Math.max(MIN_RATE_LIMIT_PER_MINUTE, this.limitPerMinute - 10)
    logger.warn('Adaptive rate limit reduced after provider pressure', { limitPerMinute: this.limitPerMinute })
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const sendWithRetries = async (payload, context = {}) => {
  let attempt = 0
  let lastError = null

  while (attempt < MAX_SEND_ATTEMPTS) {
    attempt += 1
    const result = await sendWhatsAppMessage(payload)

    if (result?.status === 'sent') {
      return result
    }

    const providerError = result?.error || `Provider returned status "${result?.status || 'unknown'}"`
    lastError = new Error(providerError)
    lastError.permanent = Boolean(result?.permanent)
    lastError.rateLimited = Boolean(result?.rateLimited)
    lastError.provider = result?.provider || null

    logger.warn('Reminder send attempt failed', {
      attempt,
      maxAttempts: MAX_SEND_ATTEMPTS,
      jobId: payload.jobId,
      phone: payload.to,
      permanent: lastError.permanent,
      error: providerError,
      ...context
    })

    if (lastError.permanent || attempt >= MAX_SEND_ATTEMPTS) {
      throw lastError
    }

    await sleep(RETRY_BASE_DELAY_MS * attempt)
  }

  throw lastError || new Error('Failed to send reminder message')
}

const deferReminderItem = async ({ type, payload, delayMs }) => {
  const queue = getReminderQueue()
  await queue.add(
    `${type}-deferred`,
    payload,
    {
      delay: Math.max(60_000, Math.min(delayMs, 72 * 60 * 60 * 1000))
    }
  )
}

const shouldDefer = async ({ visitorTimezone, reminderPreferences, deferCount }) => {
  if (Number(deferCount) >= MAX_DEFER_COUNT) {
    return { defer: false, reason: 'max_defer_reached', delayMs: 0 }
  }

  const decision = await evaluateDeliveryWindow({
    now: new Date(),
    visitorTimezone: visitorTimezone || 'Africa/Lagos',
    reminderPreferences: reminderPreferences || {}
  })

  if (!decision.canSendNow) {
    return {
      defer: true,
      reason: decision.reason,
      delayMs: decision.delayMs
    }
  }

  return { defer: false, reason: 'ready', delayMs: 0 }
}

const logSkippedDuplicate = async ({ job, visitorId, eventId, messageBody }) => {
  await logMessageSent({
    jobId: job.id,
    visitorId,
    eventId: eventId || null,
    messageText: messageBody,
    messageType: 'text',
    status: 'skipped_duplicate'
  })
}

const processServiceReminderBatch = async (job) => {
  const visitors = Array.isArray(job.data?.visitors)
    ? job.data.visitors
    : job.data?.visitor
      ? [job.data.visitor]
      : []
  const context = job.data?.context || {}
  let processed = 0
  let failed = 0
  let deferred = 0
  let skippedDuplicate = 0

  if (!Array.isArray(visitors) || visitors.length === 0) {
    logger.error('Invalid visitor list in job payload')
    return { processed: 0, failed: 1 }
  }

  for (const visitor of visitors) {
    let messageBody = ''
    const deferCount = Number(visitor?.deferCount || 0)
    try {
      const deferCheck = await shouldDefer({
        visitorTimezone: visitor?.timezone || 'Africa/Lagos',
        reminderPreferences: visitor?.reminder_preferences || {},
        deferCount
      })

      if (deferCheck.defer) {
        await deferReminderItem({
          type: 'service-reminder',
          delayMs: deferCheck.delayMs,
          payload: {
            type: 'service-single',
            context,
            visitor: {
              ...visitor,
              deferCount: deferCount + 1
            }
          }
        })
        deferred++
        continue
      }

      if (!adaptiveRateLimiter.canSend()) {
        await sleep(BATCH_DELAY_MS)
      }

      messageBody = await generateServiceReminderMessage({
        name: visitor.name,
        serviceTime: context.serviceTime,
        isFirstSunday: context.isFirstSunday
      })

      const isDuplicate = await hasRecentMessageFingerprint({
        visitorId: visitor.id,
        eventId: null,
        messageText: messageBody,
        messageType: 'text',
        withinHours: 30
      })
      if (isDuplicate) {
        skippedDuplicate++
        await logSkippedDuplicate({ job, visitorId: visitor.id, messageBody })
        continue
      }

      const result = await sendWithRetries(
        {
          to: visitor.phone_number,
          body: messageBody,
          jobId: job.id
        },
        { reminderType: 'service', visitorId: visitor.id }
      )

      await logMessageSent({
        jobId: job.id,
        visitorId: visitor.id,
        providerMessageId: result.providerMessageId,
        providerName: result.provider || 'unknown',
        messageType: 'text',
        messageText: messageBody,
        status: result.status || 'sent'
      })

      adaptiveRateLimiter.consume()
      adaptiveRateLimiter.onSuccess()
      await recordDeliverySuccess(visitor.phone_number).catch(() => {})
      processed++
      logger.debug('Service reminder sent', { phone: visitor.phone_number, messagePreview: messageBody.slice(0, 50) })
    } catch (error) {
      failed++
      if (error?.rateLimited) {
        adaptiveRateLimiter.onRateLimited()
      }
      logger.error('Failed to send service reminder', { phone: visitor.phone_number, error: error.message })
      await recordDeliveryFailure(visitor.phone_number, {
        reason: error.message,
        blockAfter: 3,
        blockHours: 24
      }).catch(() => {})
      await logMessageSent({
        jobId: job.id,
        visitorId: visitor.id,
        providerName: error?.provider || null,
        messageType: 'text',
        messageText: messageBody || null,
        status: 'failed',
        error: error.message
      })
    }
  }

  return { processed, failed, deferred, skippedDuplicate, total: visitors.length }
}

const processEventReminderBatch = async (job) => {
  const reminders = Array.isArray(job.data?.reminders)
    ? job.data.reminders
    : job.data?.reminder
      ? [job.data.reminder]
      : []
  let processed = 0
  let failed = 0
  let deferred = 0
  let skippedDuplicate = 0

  for (const reminder of reminders) {
    let messageBody = ''
    const deferCount = Number(reminder?.deferCount || 0)
    try {
      const deferCheck = await shouldDefer({
        visitorTimezone: reminder?.visitorTimezone || 'Africa/Lagos',
        reminderPreferences: reminder?.reminderPreferences || {},
        deferCount
      })

      if (deferCheck.defer) {
        await deferReminderItem({
          type: 'event-reminder',
          delayMs: deferCheck.delayMs,
          payload: {
            type: 'event-single',
            reminder: {
              ...reminder,
              deferCount: deferCount + 1
            }
          }
        })
        deferred++
        continue
      }

      if (!adaptiveRateLimiter.canSend()) {
        await sleep(BATCH_DELAY_MS)
      }

      messageBody = await generateEventReminderMessage({
        name: reminder.visitorName,
        eventTitle: reminder.eventTitle,
        eventDate: reminder.eventDate,
        eventTime: reminder.eventTime,
        registrationLink: reminder.registrationLink
      })

      const isDuplicate = await hasRecentMessageFingerprint({
        visitorId: reminder.visitorId,
        eventId: reminder.eventId,
        messageText: messageBody,
        messageType: reminder?.media?.url ? 'media' : 'text',
        withinHours: 24
      })
      if (isDuplicate) {
        skippedDuplicate++
        await logSkippedDuplicate({
          job,
          visitorId: reminder.visitorId,
          eventId: reminder.eventId,
          messageBody
        })
        continue
      }

      const result = await sendWithRetries(
        {
          to: reminder.phoneNumber,
          body: messageBody,
          media: reminder?.media?.url
            ? {
                type: reminder.media.type || 'image',
                url: reminder.media.url,
                caption: reminder.media.caption || messageBody
              }
            : undefined,
          jobId: job.id
        },
        { reminderType: 'event', visitorId: reminder.visitorId, eventId: reminder.eventId }
      )

      await logMessageSent({
        jobId: job.id,
        visitorId: reminder.visitorId,
        eventId: reminder.eventId,
        providerMessageId: result.providerMessageId,
        providerName: result.provider || 'unknown',
        messageType: reminder?.media?.url ? 'media' : 'text',
        messageText: messageBody,
        status: result.status || 'sent'
      })

      adaptiveRateLimiter.consume()
      adaptiveRateLimiter.onSuccess()
      await recordDeliverySuccess(reminder.phoneNumber).catch(() => {})
      processed++
      logger.debug('Event reminder sent', { phone: reminder.phoneNumber, event: reminder.eventTitle })
    } catch (error) {
      failed++
      if (error?.rateLimited) {
        adaptiveRateLimiter.onRateLimited()
      }
      logger.error('Failed to send event reminder', { phone: reminder.phoneNumber, error: error.message })
      await recordDeliveryFailure(reminder.phoneNumber, {
        reason: error.message,
        blockAfter: 3,
        blockHours: 24
      }).catch(() => {})
      await logMessageSent({
        jobId: job.id,
        visitorId: reminder.visitorId,
        eventId: reminder.eventId,
        providerName: error?.provider || null,
        messageType: reminder?.media?.url ? 'media' : 'text',
        messageText: messageBody || null,
        status: 'failed',
        error: error.message
      })
    }
  }

  return { processed, failed, deferred, skippedDuplicate, total: reminders.length }
}

export const reminderWorker = new Worker(
  queueNames.REMINDERS,
  async (job) => {
    logger.info('Processing reminder job', { jobId: job.id, name: job.name, type: job.data?.type })

    if (job.data?.type === 'service') {
      return processServiceReminderBatch(job)
    }

    if (job.data?.type === 'service-single') {
      return processServiceReminderBatch(job)
    }

    if (job.data?.type === 'event') {
      return processEventReminderBatch(job)
    }

    if (job.data?.type === 'event-single') {
      return processEventReminderBatch(job)
    }

    return { processed: 0, failed: 0 }
  },
  {
    connection: redisConnection,
    concurrency: 1
  }
)

reminderWorker.on('completed', (job, result) => {
  logger.info('Reminder job completed', { jobId: job.id, ...result })
})

reminderWorker.on('failed', (job, error) => {
  logger.error('Reminder job failed', { jobId: job?.id, error: error.message })
})
reminderWorker.on('error', (error) => {
  logger.error('Worker error', { error: error.message })
})
