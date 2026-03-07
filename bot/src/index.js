import { createBotApp } from './app.js'
import { env } from './config/env.js'
import { logger } from './lib/logger.js'
import { initDatabase } from './db/connection.js'
import { registerSchedulerJobs, startEventCacheRefresh } from './scheduler/reminder.scheduler.js'
import { checkAlertThresholds, triggerWebhookAlert } from './services/monitoring.service.js'

const app = createBotApp()

initDatabase()

app.listen(env.BOT_PORT, env.BOT_HOST, () => {
  logger.info('Bot API server started', {
    host: env.BOT_HOST,
    port: env.BOT_PORT,
    schedulerEnabled: env.ENABLE_SCHEDULER
  })
})

startEventCacheRefresh()

if (env.ENABLE_SCHEDULER) {
  registerSchedulerJobs()
}

setInterval(async () => {
  try {
    const alertCheck = await checkAlertThresholds()
    if (alertCheck.hasAlerts && env.ALERT_WEBHOOK_URL) {
      for (const alert of alertCheck.alerts) {
        await triggerWebhookAlert(alert, env.ALERT_WEBHOOK_URL)
      }
    }
  } catch (error) {
    logger.error('Alert check interval error', { error: error.message })
  }
}, 5 * 60 * 1000)
