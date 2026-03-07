import { Queue } from 'bullmq'

import { redisConnection } from './connection.js'

export const queueNames = {
  REMINDERS: 'reminders'
}

let reminderQueue

export const getReminderQueue = () => {
  if (!reminderQueue) {
    reminderQueue = new Queue(queueNames.REMINDERS, {
      connection: redisConnection,
      defaultJobOptions: {
        removeOnComplete: 500,
        removeOnFail: 500,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000
        }
      }
    })
  }

  return reminderQueue
}
