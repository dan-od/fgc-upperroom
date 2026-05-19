import express from 'express'

import {
  getAdminSocialQrPngBuffer,
  getAdminSocialQrs,
  generateAdminSession,
  getAdminQrPngBuffer,
  getAdminSessionInfo,
  getAttendanceCount,
  getAttendanceSnapshot,
  submitScanCheckin,
  submitAssistedCheckin,
  submitSelfCheckin
} from '../services/attendance.service.js'
import { ensureBrowserToken } from '../utils/id.js'

const router = express.Router()

const getAdminSecret = () => {
  const secret = process.env.ATTENDANCE_ADMIN_KEY
  if (!secret) throw new Error('ATTENDANCE_ADMIN_KEY must be set')
  return secret
}

// Fail fast: crash at startup rather than silently using no key.
getAdminSecret()

const assertAdmin = (req, res) => {
  const provided = req.headers['x-attendance-admin-key']
  if (!provided || provided !== getAdminSecret()) {
    res.status(401).json({ success: false, reason: 'unauthorized', message: 'Admin authorization failed.' })
    return false
  }
  return true
}

const resolveClientIp = (req) => {
  const forwarded = req.headers['x-forwarded-for']
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim()
  }
  return req.socket.remoteAddress || 'unknown'
}

const resolveOrigin = (req) => {
  const configuredBase = String(process.env.ATTENDANCE_PUBLIC_BASE_URL || '').trim()
  if (configuredBase) {
    try {
      const url = new URL(configuredBase)
      return url.origin
    } catch {
      // Invalid override; fall back to request-derived origin.
    }
  }

  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim()
  const forwardedHost = String(req.headers['x-forwarded-host'] || '').split(',')[0].trim()
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`
  }

  return `${req.protocol}://${req.get('host')}`
}

router.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'attendance' })
})

router.get('/current', (req, res) => {
  const snapshot = getAttendanceSnapshot()
  res.json(snapshot)
})

router.get('/count', (req, res) => {
  res.json(getAttendanceCount())
})

router.post('/checkin', (req, res) => {
  const { mode = 'self', name, browserToken, helperName, assistedName, assistedPhone, code, qrToken } = req.body || {}
  const ip = resolveClientIp(req)
  const safeBrowserToken = ensureBrowserToken(browserToken)

  if (mode === 'assisted') {
    if (!code && !qrToken) {
      return res.status(400).json({ success: false, reason: 'validation', message: 'Attendance code is required.' })
    }

    if (!assistedName || !assistedPhone) {
      return res.status(400).json({ success: false, reason: 'validation', message: 'Assisted name and phone are required.' })
    }

    const result = submitAssistedCheckin({ helperName: helperName || name || 'Helper', assistedName, assistedPhone, ip, code, qrToken })
    return res.status(result.success ? 201 : 200).json({
      ...result,
      showAssistedButton: result.showAssistedButton ?? true,
      browserToken: safeBrowserToken
    })
  }

  if (!code && !qrToken) {
    return res.status(400).json({ success: false, reason: 'validation', message: 'Attendance code is required.' })
  }

  if (!name) {
    return res.status(400).json({ success: false, reason: 'validation', message: 'Name is required.' })
  }

  const result = submitSelfCheckin({ name, browserToken: safeBrowserToken, ip, code, qrToken })
  return res.status(result.success ? 201 : 200).json({
    ...result,
    showAssistedButton: result.showAssistedButton ?? true,
    browserToken: safeBrowserToken
  })
})

router.get('/scan/:qrToken', (req, res) => {
  const ip = resolveClientIp(req)
  const userAgent = req.headers['user-agent'] || 'unknown-agent'
  const fingerprint = `${ip}|${userAgent}`
  const result = submitScanCheckin({ qrToken: req.params.qrToken, fingerprint, ip })

  const htmlMessage = result.success
    ? 'Thank you for worshipping with us today, God bless you and we hope to see you again next week!'
    : result.reason === 'duplicate'
      ? 'You already signed the attendance.'
      : result.message
  res.status(result.success ? 200 : 400).send(`<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Attendance</title>
    <style>
      body { font-family: system-ui, sans-serif; padding: 2rem; background: #0b1022; color: #fff; }
      .card { max-width: 420px; margin: 8vh auto; background: #121a36; border-radius: 12px; padding: 1.25rem; border: 1px solid rgba(255,255,255,.15); }
      .title { font-size: 1.05rem; margin-bottom: .6rem; }
      .count { opacity: .85; font-size: .95rem; }
    </style>
  </head>
  <body>
    <div class="card">
      <div class="title">${htmlMessage}</div>
      <div class="count">Current attendance: ${result.attendeeCount || 0}</div>
    </div>
  </body>
</html>`)
})

router.get('/admin/session', async (req, res) => {
  if (!assertAdmin(req, res)) return

  const origin = resolveOrigin(req)
  const result = await getAdminSessionInfo({ origin })
  res.status(result.status).json(result.payload)
})

router.post('/admin/session/generate', async (req, res) => {
  if (!assertAdmin(req, res)) return

  const origin = resolveOrigin(req)
  const force = Boolean(req.body?.force)
  const result = await generateAdminSession({ origin, force })
  res.status(result.status).json(result.payload)
})

router.get('/admin/qr.png', async (req, res) => {
  if (!assertAdmin(req, res)) return

  const origin = resolveOrigin(req)
  const result = await getAdminQrPngBuffer({ origin })

  if (!result.ok) {
    return res.status(result.status).json(result.payload)
  }

  res.setHeader('Content-Type', 'image/png')
  res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`)
  return res.status(200).send(result.buffer)
})

router.get('/admin/social-links/qr', async (req, res) => {
  if (!assertAdmin(req, res)) return

  const origin = resolveOrigin(req)
  const result = await getAdminSocialQrs({ origin })
  return res.status(result.status).json(result.payload)
})

router.get('/admin/social-links/:socialKey/qr.png', async (req, res) => {
  if (!assertAdmin(req, res)) return

  const origin = resolveOrigin(req)
  const result = await getAdminSocialQrPngBuffer({ origin, socialKey: req.params.socialKey })
  if (!result.ok) {
    return res.status(result.status).json(result.payload)
  }

  res.setHeader('Content-Type', 'image/png')
  res.setHeader('Content-Disposition', `attachment; filename="${result.fileName}"`)
  return res.status(200).send(result.buffer)
})

export default router
