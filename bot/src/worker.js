import { logger } from './lib/logger.js'
import './workers/reminder.worker.js'

logger.info('Reminder worker started')
