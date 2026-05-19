import { logger } from './logger.js'

const PLACEHOLDER_PATTERNS = [/^admin123$/i, /^replace_me$/i, /^your[_-]/i]

const isWeakSecret = (value = '') => {
  const normalized = String(value || '').trim()
  if (!normalized) return true
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(normalized))
}

export const getAdminSecret = () => {
  const value = process.env.BOT_ADMIN_API_KEY || ''
  return isWeakSecret(value) ? '' : value
}

export const assertAdmin = (req, res) => {
  const expected = getAdminSecret()
  if (!expected) {
    logger.error('Admin secret not configured')
    res.status(503).json({ error: 'Admin API not configured.' })
    return false
  }

  const provided = req.headers['x-bot-admin-key']
  if (!provided || provided !== expected) {
    res.status(401).json({ error: 'Admin authorization failed.' })
    return false
  }

  return true
}

