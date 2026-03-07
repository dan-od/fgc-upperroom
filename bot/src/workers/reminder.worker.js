import { Worker } from 'bullmq'

import { logger } from '../lib/logger.js'
import { redisConnection } from '../queue/connection.js'
import { queueNames } from '../queue/queues.js'
import { generateServiceReminderMessage, generateEventReminderMessage } from '../services/message-generator.service.js'
import { sendWhatsAppMessage } from '../services/whatsapp.service.js'
import { logMessageSent } from '../services/message.repository.js'

const RATE_LIMIT_PER_MINUTE = 60
const BATCH_DELAY_MS = 1000 

const rateLimiter = {
  count: 0,
  resetTime: Date.now() + 60000,
  canSend: function () {
    if (Date.now() > this.resetTime) {
      this.count = 0
      this.resetTime = Date.now() + 60000
    }
    return this.count < RATE_LIMIT_PER_MINUTE
  },
  increment: function () {
    this.count++
  }
}

const processServiceReminderBatch = async (job) => {
  const { visitors, context } = job.data
  let processed = 0
  let failed = 0

  if (!visitors || !Array.isArray(visitors)) {
    logger.error('Invalid visitor list in job payload')
    return { processed: 0, failed: 1 }
  }

  for (const visitor of visitors) {
    try {
      if (!rateLimiter.canSend()) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
      }

      const messageBody = await generateServiceReminderMessage({
        name: visitor.name,
        serviceTime: context.serviceTime,
        isFirstSunday: context.isFirstSunday
      })

      const result = await sendWhatsAppMessage({
        to: visitor.phone_number,
        body: messageBody,
        jobId: job.id
      })

      await logMessageSent({
        jobId: job.id,
        visitorId: visitor.id,
        providerMessageId: result.providerMessageId,
        messageText: messageBody,
        status: result.status || 'sent'
      })

      rateLimiter.increment()
      processed++
      logger.debug('Service reminder sent', { phone: visitor.phone_number, messagePreview: messageBody.slice(0, 50) })
    } catch (error) {
      failed++
      logger.error('Failed to send service reminder', { phone: visitor.phone_number, error: error.message })
      await logMessageSent({
        jobId: job.id,
        visitorId: visitor.id,
        messageText: 'failed to generate',
        status: 'failed',
        error: error.message
      })
    }
  }

  return { processed, failed, total: visitors.length }
}

const processEventReminderBatch = async (job) => {
  const reminders = job.data.reminders || []
  let processed = 0
  let failed = 0

  for (const reminder of reminders) {
    try {
      if (!rateLimiter.canSend()) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS))
      }

      const messageBody = await generateEventReminderMessage({
        name: reminder.visitorName,
        eventTitle: reminder.eventTitle,
        eventDate: reminder.eventDate
      })

      const result = await sendWhatsAppMessage({
        to: reminder.phoneNumber,
        body: messageBody,
        jobId: job.id
      })

      await logMessageSent({
        jobId: job.id,
        visitorId: reminder.visitorId,
        eventId: reminder.eventId,
        providerMessageId: result.providerMessageId,
        messageText: messageBody,
        status: result.status || 'sent'
      })

      rateLimiter.increment()
      processed++
      logger.debug('Event reminder sent', { phone: reminder.phoneNumber, event: reminder.eventTitle })
    } catch (error) {
      failed++
      logger.error('Failed to send event reminder', { phone: reminder.phoneNumber, error: error.message })
      await logMessageSent({
        jobId: job.id,
        visitorId: reminder.visitorId,
        eventId: reminder.eventId,
        messageText: 'failed to generate',
        status: 'failed',
        error: error.message
      })
    }
  }

  return { processed, failed, total: reminders.length }
}

export const reminderWorker = new Worker(
  queueNames.REMINDERS,
  async (job) => {
    logger.info('Processing reminder job', { jobId: job.id, name: job.name, type: job.data?.type })

    if (job.data?.type === 'service') {
      return processServiceReminderBatch(job)
    }

    if (job.data?.type === 'event') {
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
