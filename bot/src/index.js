import { createBotApp } from './app.js'
import { env } from './config/env.js'
import { logger } from './lib/logger.js'
import { initDatabase, closeDatabase } from './db/connection.js'
import { registerSchedulerJobs, runStartupReminderCatchup, startEventCacheRefresh } from './scheduler/reminder.scheduler.js'
import { checkAlertThresholds, triggerWebhookAlert } from './services/monitoring.service.js'
import { sendOpenClawAlertDigest } from './services/openclaw.service.js'

const app = createBotApp()

initDatabase()

const server = app.listen(env.BOT_PORT, env.BOT_HOST, () => {
  logger.info('Bot API server started', {
    host: env.BOT_HOST,
    port: env.BOT_PORT,
    schedulerEnabled: env.ENABLE_SCHEDULER
  })
})

startEventCacheRefresh()

if (env.ENABLE_SCHEDULER) {
  registerSchedulerJobs()
  runStartupReminderCatchup().catch((error) => {
    logger.error('Startup reminder catch-up failed', { error: error.message })
  })
}

const alertInterval = setInterval(async () => {
  try {
    const alertCheck = await checkAlertThresholds()
    if (alertCheck.hasAlerts) {
      if (env.ALERT_WEBHOOK_URL) {
        for (const alert of alertCheck.alerts) {
          await triggerWebhookAlert(alert, env.ALERT_WEBHOOK_URL)
        }
      }

      await sendOpenClawAlertDigest({
        alerts: alertCheck.alerts,
        telemetry: alertCheck.telemetry
      })
    }
  } catch (error) {
    logger.error('Alert check interval error', { error: error.message })
  }
}, 5 * 60 * 1000)

const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received — starting graceful shutdown`)

  const forceExit = setTimeout(() => {
    logger.error('Graceful shutdown timed out after 15s — forcing exit')
    process.exit(1)
  }, 15_000)

  try {
    clearInterval(alertInterval)
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())))
    await closeDatabase()
    clearTimeout(forceExit)
    logger.info('Graceful shutdown complete')
    process.exit(0)
  } catch (error) {
    logger.error('Error during graceful shutdown', { error: error.message })
    process.exit(1)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
