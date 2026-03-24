import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'node:path'

import attendanceRoutes from './routes/attendance.js'
import { autoGenerateSundaySession, getSocialLinkRedirectTarget } from './services/attendance.service.js'

dotenv.config({ path: path.resolve(process.cwd(), '.env') })

const app = express()
const PORT = Number(process.env.ATTENDANCE_PORT || 4201)

app.use(cors())
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

const autoGenerate = () => {
  const outcome = autoGenerateSundaySession()
  if (outcome.generated) {
    console.log(`Attendance session auto-generated for ${outcome.serviceDate}`)
  }
}

autoGenerate()
setInterval(autoGenerate, 60 * 1000)

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Attendance service running on port ${PORT}`)
})
