import crypto from 'node:crypto'

export const generateAttendanceCode = () => {
  const raw = crypto.randomInt(100000, 999999)
  return String(raw)
}

export const ensureBrowserToken = (value) => {
  if (value && value.length >= 16) return value
  return crypto.randomBytes(16).toString('hex')
}

export const sha256 = (value) => {
  return crypto.createHash('sha256').update(value).digest('hex')
}
