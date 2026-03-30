import QRCode from 'qrcode'

import { getSocialLinkByKey, listSocialLinks } from '../config/social-links.js'
import { attendanceStore } from '../store/attendance.store.js'
import { generateAttendanceCode, sha256 } from '../utils/id.js'
import { formatServiceDate, getWindowStatus, isAttendanceWindowOpen, lagosNow } from '../utils/time.js'
import { syncAttendanceCheckin, syncAttendanceSession } from './attendance-history-sync.js'

const RATE_LIMIT_WINDOW_MS = 20 * 60 * 1000
const SELF_IP_LIMIT_PER_WINDOW = 5
const ASSISTED_IP_LIMIT_PER_WINDOW = 8
const SOCIAL_REDIRECT_BASE_PATH = '/attendance/go'

const buildSocialRedirectUrl = ({ origin, key }) => `${origin}${SOCIAL_REDIRECT_BASE_PATH}/${key}`

const trimWindowHits = (entries, nowMs) => entries.filter((entry) => nowMs - entry < RATE_LIMIT_WINDOW_MS)

const getSessionForNow = () => {
  if (!isAttendanceWindowOpen(lagosNow())) return null
  const serviceDate = formatServiceDate(lagosNow())
  return attendanceStore.getSession(serviceDate)
}

const createSessionForServiceDate = (serviceDate) => {
  const session = attendanceStore.saveSession(serviceDate, {
    id: `session-${serviceDate}`,
    serviceDate,
    code: generateAttendanceCode(),
    qrToken: sha256(`qr:${serviceDate}:${Date.now()}:${Math.random()}`).slice(0, 24),
    createdAt: new Date().toISOString()
  })

  void syncAttendanceSession(session)
  return session
}

const getSessionCount = (sessionId) => attendanceStore.listCheckinsBySession(sessionId).length

const getQrUrlForSession = ({ origin, qrToken }) => `${origin}/attendance/api/scan/${qrToken}`

const buildWindowClosedPayload = () => ({
  success: false,
  reason: 'window_closed',
  message: 'Attendance is only open on Sunday between 12:00 AM and 6:00 PM.',
  showAssistedButton: false
})

const buildNoActiveSessionPayload = () => ({
  success: false,
  reason: 'session_not_ready',
  message: 'Attendance is not available yet. Please wait for the admin to publish the service code.',
  showAssistedButton: false
})

const assertSessionAvailable = () => {
  if (!isAttendanceWindowOpen(lagosNow())) {
    return { ok: false, payload: buildWindowClosedPayload() }
  }

  const session = getSessionForNow()
  if (!session) {
    return { ok: false, payload: buildNoActiveSessionPayload() }
  }

  return { ok: true, session }
}

const normalizePhone = (value = '') => value.replace(/\s+/g, '')
const normalizeName = (value = '') => value.trim().replace(/\s+/g, ' ').toLowerCase()

const isSelfDuplicate = (sessionId, tokenHash, ipHash, normalizedName) => {
  return attendanceStore.listCheckinsBySession(sessionId).some((entry) => {
    if (entry.type !== 'self') return false
    if (entry.tokenHash === tokenHash) return true
    return entry.ipHash === ipHash && entry.normalizedName === normalizedName
  })
}

const isAssistedDuplicate = (sessionId, phoneHash) => {
  return attendanceStore.listCheckinsBySession(sessionId).some((entry) => entry.type === 'assisted' && entry.phoneHash === phoneHash)
}

const checkRateLimit = ({ ip, browserToken, mode }) => {
  const nowMs = Date.now()
  const ipKey = `ip:${ip}:${mode}`
  const browserKey = `browser:${browserToken}:self`

  const ipHits = trimWindowHits(attendanceStore.getRateLimitHits(ipKey), nowMs)
  attendanceStore.setRateLimitHits(ipKey, ipHits)

  if (mode === 'self') {
    const browserHits = trimWindowHits(attendanceStore.getRateLimitHits(browserKey), nowMs)
    attendanceStore.setRateLimitHits(browserKey, browserHits)

    if (browserHits.length >= 1) {
      return { allowed: false, reason: 'rate_limited' }
    }

    if (ipHits.length >= SELF_IP_LIMIT_PER_WINDOW) {
      return { allowed: false, reason: 'rate_limited' }
    }

    attendanceStore.addRateLimitHit(browserKey, nowMs)
    attendanceStore.addRateLimitHit(ipKey, nowMs)
    return { allowed: true }
  }

  if (ipHits.length >= ASSISTED_IP_LIMIT_PER_WINDOW) {
    return { allowed: false, reason: 'rate_limited' }
  }

  attendanceStore.addRateLimitHit(ipKey, nowMs)
  return { allowed: true }
}

const validateSubmittedCode = ({ session, code, qrToken }) => {
  const providedCode = typeof code === 'string' ? code.trim() : ''
  const providedQrToken = typeof qrToken === 'string' ? qrToken.trim() : ''
  const tokenMatched = providedQrToken && providedQrToken === session.qrToken
  const codeMatched = providedCode && providedCode === session.code

  return tokenMatched || codeMatched
}

export const getAttendanceSnapshot = () => {
  const now = lagosNow()
  const window = getWindowStatus(now)

  if (!window.isOpen) {
    return {
      visible: false,
      open: false,
      attendeeCount: 0,
      message: 'Attendance window is closed.',
      window,
      sessionReady: false
    }
  }

  const session = getSessionForNow()
  if (!session) {
    return {
      visible: true,
      open: true,
      attendeeCount: 0,
      message: 'Attendance opens when an admin publishes the service code.',
      window,
      sessionReady: false
    }
  }

  return {
    visible: true,
    open: true,
    attendeeCount: getSessionCount(session.id),
    message: 'Attendance is open.',
    window,
    sessionReady: true
  }
}

export const getAttendanceCount = () => {
  const assertion = assertSessionAvailable()
  if (!assertion.ok) {
    return { visible: false, open: false, attendeeCount: 0 }
  }

  return {
    visible: true,
    open: true,
    attendeeCount: getSessionCount(assertion.session.id)
  }
}

export const submitSelfCheckin = ({ name, browserToken, ip, code, qrToken }) => {
  const assertion = assertSessionAvailable()
  if (!assertion.ok) return assertion.payload

  const { session } = assertion

  if (!validateSubmittedCode({ session, code, qrToken })) {
    return {
      success: false,
      reason: 'invalid_code',
      message: 'Invalid attendance code.',
      attendeeCount: getSessionCount(session.id)
    }
  }

  const tokenHash = sha256(browserToken)
  const ipHash = sha256(ip)
  const normalizedName = normalizeName(name)
  if (isSelfDuplicate(session.id, tokenHash, ipHash, normalizedName)) {
    return {
      success: false,
      reason: 'duplicate',
      message: 'You already signed the attendance',
      attendeeCount: getSessionCount(session.id)
    }
  }

  const rate = checkRateLimit({ ip, browserToken, mode: 'self' })
  if (!rate.allowed) {
    return {
      success: false,
      reason: 'rate_limited',
      message: 'Please wait 20 minutes before trying again.',
      attendeeCount: getSessionCount(session.id)
    }
  }

  const checkin = attendanceStore.addCheckin({
    id: `self-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    sessionId: session.id,
    serviceDate: session.serviceDate,
    sessionCode: session.code,
    qrTokenHash: session.qrToken ? session.qrToken.slice(0, 12) : null,
    type: 'self',
    name,
    normalizedName,
    tokenHash,
    ipHash,
    createdAt: new Date().toISOString()
  })
  void syncAttendanceCheckin(checkin)

  return {
    success: true,
    attendeeCount: getSessionCount(session.id),
    message: 'Thank you for worshipping with us today, God bless you and we hope to see you again next week!'
  }
}

export const submitAssistedCheckin = ({ helperName, assistedName, assistedPhone, ip, code, qrToken }) => {
  const assertion = assertSessionAvailable()
  if (!assertion.ok) return assertion.payload

  const { session } = assertion

  if (!validateSubmittedCode({ session, code, qrToken })) {
    return {
      success: false,
      reason: 'invalid_code',
      message: 'Invalid attendance code.',
      attendeeCount: getSessionCount(session.id)
    }
  }

  const phoneHash = sha256(normalizePhone(assistedPhone))
  if (isAssistedDuplicate(session.id, phoneHash)) {
    return {
      success: false,
      reason: 'duplicate',
      message: 'You already signed the attendance',
      attendeeCount: getSessionCount(session.id)
    }
  }

  const rate = checkRateLimit({ ip, browserToken: helperName || 'helper', mode: 'assisted' })
  if (!rate.allowed) {
    return {
      success: false,
      reason: 'rate_limited',
      message: 'Please wait 20 minutes before trying again.',
      attendeeCount: getSessionCount(session.id)
    }
  }

  const checkin = attendanceStore.addCheckin({
    id: `assist-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    sessionId: session.id,
    serviceDate: session.serviceDate,
    sessionCode: session.code,
    qrTokenHash: session.qrToken ? session.qrToken.slice(0, 12) : null,
    type: 'assisted',
    helperName,
    assistedName,
    phoneHash,
    ipHash: sha256(ip),
    createdAt: new Date().toISOString()
  })
  void syncAttendanceCheckin(checkin)

  return {
    success: true,
    attendeeCount: getSessionCount(session.id),
    message: 'Thank you for worshipping with us today, God bless you and we hope to see you again next week!'
  }
}

export const submitScanCheckin = ({ qrToken, fingerprint, ip }) => {
  const assertion = assertSessionAvailable()
  if (!assertion.ok) return assertion.payload

  const { session } = assertion
  if (qrToken !== session.qrToken) {
    return {
      success: false,
      reason: 'invalid_qr',
      message: 'Invalid attendance QR token.',
      attendeeCount: getSessionCount(session.id)
    }
  }

  const fingerprintHash = sha256(fingerprint)
  const duplicate = attendanceStore
    .listCheckinsBySession(session.id)
    .some((entry) => entry.type === 'scan' && entry.fingerprintHash === fingerprintHash)

  if (duplicate) {
    return {
      success: false,
      reason: 'duplicate',
      message: 'You already signed the attendance',
      attendeeCount: getSessionCount(session.id)
    }
  }

  const rate = checkRateLimit({ ip, browserToken: fingerprint, mode: 'scan' })
  if (!rate.allowed) {
    return {
      success: false,
      reason: 'rate_limited',
      message: 'Please wait 20 minutes before trying again.',
      attendeeCount: getSessionCount(session.id)
    }
  }

  const checkin = attendanceStore.addCheckin({
    id: `scan-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    sessionId: session.id,
    serviceDate: session.serviceDate,
    sessionCode: session.code,
    qrTokenHash: session.qrToken ? session.qrToken.slice(0, 12) : null,
    type: 'scan',
    fingerprintHash,
    ipHash: sha256(ip),
    createdAt: new Date().toISOString()
  })
  void syncAttendanceCheckin(checkin)

  return {
    success: true,
    attendeeCount: getSessionCount(session.id),
    message: 'Thank you for worshipping with us today, God bless you and we hope to see you again next week!'
  }
}

export const getAdminSessionInfo = async ({ origin }) => {
  const window = getWindowStatus(lagosNow())

  if (!isAttendanceWindowOpen(lagosNow())) {
    return {
      ok: false,
      status: 400,
      payload: {
        success: false,
        reason: 'window_closed',
        message: 'Attendance can only be generated on Sunday from 12:00 AM to 6:00 PM.',
        testMode: Boolean(window.testMode)
      }
    }
  }

  const session = getSessionForNow()
  if (!session) {
    return {
      ok: true,
      status: 200,
      payload: {
        success: true,
        sessionReady: false,
        message: 'No attendance code has been generated yet for this Sunday.',
        testMode: Boolean(window.testMode)
      }
    }
  }

  const qrCheckinUrl = getQrUrlForSession({ origin, qrToken: session.qrToken })
  const qrPngDataUrl = await QRCode.toDataURL(qrCheckinUrl, {
    width: 360,
    margin: 1,
    errorCorrectionLevel: 'M'
  })

  return {
    ok: true,
    status: 200,
    payload: {
      success: true,
      sessionReady: true,
      testMode: Boolean(window.testMode),
      session: {
        serviceDate: session.serviceDate,
        code: session.code,
        qrToken: session.qrToken,
        qrCheckinUrl,
        qrPngDataUrl
      }
    }
  }
}

export const generateAdminSession = async ({ origin, force = false }) => {
  const window = getWindowStatus(lagosNow())

  if (!isAttendanceWindowOpen(lagosNow())) {
    return {
      ok: false,
      status: 400,
      payload: {
        success: false,
        reason: 'window_closed',
        message: 'Attendance can only be generated on Sunday from 12:00 AM to 6:00 PM.',
        testMode: Boolean(window.testMode)
      }
    }
  }

  const serviceDate = formatServiceDate(lagosNow())
  const existing = attendanceStore.getSession(serviceDate)

  if (existing && !force) {
    return getAdminSessionInfo({ origin })
  }

  if (existing && force) {
    attendanceStore.clearCheckinsBySession(existing.id)
  }

  const session = createSessionForServiceDate(serviceDate)

  const qrCheckinUrl = getQrUrlForSession({ origin, qrToken: session.qrToken })
  const qrPngDataUrl = await QRCode.toDataURL(qrCheckinUrl, {
    width: 360,
    margin: 1,
    errorCorrectionLevel: 'M'
  })

  return {
    ok: true,
    status: 201,
    payload: {
      success: true,
      sessionReady: true,
      testMode: Boolean(window.testMode),
      session: {
        serviceDate: session.serviceDate,
        code: session.code,
        qrToken: session.qrToken,
        qrCheckinUrl,
        qrPngDataUrl
      }
    }
  }
}

export const autoGenerateSundaySession = () => {
  if (!isAttendanceWindowOpen(lagosNow())) {
    return { generated: false, reason: 'window_closed' }
  }

  const serviceDate = formatServiceDate(lagosNow())
  const existing = attendanceStore.getSession(serviceDate)
  if (existing) {
    return { generated: false, reason: 'already_exists', serviceDate }
  }

  const session = createSessionForServiceDate(serviceDate)
  return {
    generated: true,
    reason: 'created',
    serviceDate: session.serviceDate,
    sessionId: session.id
  }
}

export const getAdminQrPngBuffer = async ({ origin }) => {
  const session = getSessionForNow()
  if (!session) {
    return {
      ok: false,
      status: 404,
      payload: {
        success: false,
        reason: 'session_not_ready',
        message: 'Generate attendance first.'
      }
    }
  }

  const qrCheckinUrl = getQrUrlForSession({ origin, qrToken: session.qrToken })
  const pngBuffer = await QRCode.toBuffer(qrCheckinUrl, {
    type: 'png',
    width: 360,
    margin: 1,
    errorCorrectionLevel: 'M'
  })

  return {
    ok: true,
    status: 200,
    buffer: pngBuffer,
    fileName: `attendance-${session.serviceDate}.png`
  }
}

export const getSocialLinkRedirectTarget = ({ socialKey }) => {
  const link = getSocialLinkByKey(socialKey)
  if (!link) {
    return {
      ok: false,
      status: 404,
      payload: {
        success: false,
        reason: 'not_found',
        message: 'Social link not found.'
      }
    }
  }

  return {
    ok: true,
    status: 302,
    targetUrl: link.targetUrl
  }
}

export const getAdminSocialQrs = async ({ origin }) => {
  const socialLinks = listSocialLinks()
  const links = await Promise.all(
    socialLinks.map(async (link) => {
      const permanentUrl = buildSocialRedirectUrl({ origin, key: link.key })
      const qrPngDataUrl = await QRCode.toDataURL(permanentUrl, {
        width: 280,
        margin: 1,
        errorCorrectionLevel: 'M'
      })

      return {
        key: link.key,
        label: link.label,
        targetUrl: link.targetUrl,
        permanentUrl,
        qrPngDataUrl
      }
    })
  )

  return {
    ok: true,
    status: 200,
    payload: {
      success: true,
      links
    }
  }
}

export const getAdminSocialQrPngBuffer = async ({ origin, socialKey }) => {
  const link = getSocialLinkByKey(socialKey)
  if (!link) {
    return {
      ok: false,
      status: 404,
      payload: {
        success: false,
        reason: 'not_found',
        message: 'Social link not found.'
      }
    }
  }

  const permanentUrl = buildSocialRedirectUrl({ origin, key: link.key })
  const pngBuffer = await QRCode.toBuffer(permanentUrl, {
    type: 'png',
    width: 280,
    margin: 1,
    errorCorrectionLevel: 'M'
  })

  return {
    ok: true,
    status: 200,
    buffer: pngBuffer,
    fileName: `social-${link.key}.png`
  }
}
