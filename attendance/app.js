import express from 'express'
import cors from 'cors'
import helmet from 'helmet'

import attendanceRoutes from './routes/attendance.js'
import { autoGenerateSundaySession, getSocialLinkRedirectTarget, rehydrateAttendanceStore } from './services/attendance.service.js'
import { closeAttendancePool } from './db/connection.js'
import { loadProjectEnvFile } from '../lib/load-project-env.js'

loadProjectEnvFile()

const app = express()
const PORT = Number(process.env.ATTENDANCE_PORT || 4201)

app.disable('x-powered-by')
app.use(helmet())
app.use(cors({ origin: ['https://fgcupperroom.org', 'https://www.fgcupperroom.org', 'http://localhost:5173', 'http://localhost:3000'] }))
app.use(express.json({ limit: '1mb' }))

app.get('/attendance/health', (req, res) => {
  res.json({ status: 'ok', service: 'attendance', now: new Date().toISOString() })
})

app.get('/attendance/go/:socialKey', (req, res) => {
  const result = getSocialLinkRedirectTarget({ socialKey: req.params.socialKey })
  if (!result.ok) {
    return res.status(result.status).send(result.payload.message || 'Social link not found.')
  }

  return res.redirect(result.status, result.targetUrl)
})

app.use('/attendance/api', attendanceRoutes)

app.use((err, req, res, next) => {
  console.error(JSON.stringify({ level: 'error', msg: 'Unhandled error', error: err.message, path: req.originalUrl }))
  res.status(500).json({ error: 'Internal server error' })
})

const autoGenerate = () => {
  const outcome = autoGenerateSundaySession()
  if (outcome.generated) {
    console.log(`Attendance session auto-generated for ${outcome.serviceDate}`)
  }
}

await rehydrateAttendanceStore()
autoGenerate()
const autoGenInterval = setInterval(autoGenerate, 60 * 1000)

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Attendance service running on port ${PORT}`)
})

const gracefulShutdown = async (signal) => {
  console.log(`[ATTENDANCE] ${signal} received — starting graceful shutdown`)

  const forceExit = setTimeout(() => {
    console.error('[ATTENDANCE] Graceful shutdown timed out after 15s — forcing exit')
    process.exit(1)
  }, 15_000)

  try {
    clearInterval(autoGenInterval)
    await new Promise((resolve, reject) => server.close((err) => (err ? reject(err) : resolve())))
    await closeAttendancePool()
    clearTimeout(forceExit)
    console.log('[ATTENDANCE] Graceful shutdown complete')
    process.exit(0)
  } catch (error) {
    console.error('[ATTENDANCE] Error during graceful shutdown', error)
    process.exit(1)
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'))
process.on('SIGINT', () => gracefulShutdown('SIGINT'))
process.on('unhandledRejection', (reason) => {
  console.error(JSON.stringify({ level: 'error', msg: 'Unhandled rejection', reason: String(reason) }))
})
