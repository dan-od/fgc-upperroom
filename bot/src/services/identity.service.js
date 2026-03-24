import crypto from 'node:crypto'

export const normalizeName = (value = '') => {
  return String(value || '')
    .trim()
    .replace(/\s+/g, ' ')
}

export const normalizeNameKey = (value = '') => normalizeName(value).toLowerCase()

export const normalizeEmail = (value = '') => String(value || '').trim().toLowerCase()

export const normalizePhoneNumber = (value = '', options = {}) => {
  const defaultCountryCode = String(options.defaultCountryCode || '234').replace(/[^\d]/g, '')
  const raw = String(value || '').trim()
  if (!raw) return ''

  const hasPlus = raw.startsWith('+')
  const digits = raw.replace(/[^\d]/g, '')
  if (!digits) return ''

  if (hasPlus) {
    return `+${digits}`
  }

  if (digits.startsWith(defaultCountryCode) && digits.length >= 10 && digits.length <= 15) {
    return `+${digits}`
  }

  if (digits.startsWith('0') && digits.length >= 11) {
    return `+${defaultCountryCode}${digits.slice(1)}`
  }

  if (digits.length >= 10 && digits.length <= 11) {
    return `+${defaultCountryCode}${digits.slice(-10)}`
  }

  return `+${digits}`
}

export const isValidPhoneNumber = (value = '') => /^\+[1-9]\d{9,14}$/.test(String(value || '').trim())

export const hashValue = (value = '') => crypto.createHash('sha256').update(String(value || '')).digest('hex')

export const hashPhoneNumber = (value = '') => {
  const normalized = normalizePhoneNumber(value)
  return normalized ? hashValue(normalized) : ''
}

const lastDigits = (phone = '', count = 7) => {
  const digits = String(phone || '').replace(/[^\d]/g, '')
  return digits.slice(-count)
}

export const scoreDuplicateCandidate = ({ existing, nameKey, email, phone }) => {
  const existingNameKey = normalizeNameKey(existing?.name || '')
  const existingEmail = normalizeEmail(existing?.email || '')
  const existingPhone = normalizePhoneNumber(existing?.phone_number || '')

  const exactPhone = Boolean(phone) && phone === existingPhone
  const exactEmail = Boolean(email) && email === existingEmail
  const nameAndLastDigitsMatch =
    Boolean(nameKey) &&
    nameKey === existingNameKey &&
    Boolean(phone) &&
    Boolean(existingPhone) &&
    lastDigits(phone) === lastDigits(existingPhone)

  const reasons = []
  if (exactPhone) reasons.push('exact_phone')
  if (exactEmail) reasons.push('exact_email')
  if (nameAndLastDigitsMatch) reasons.push('name_plus_last7_phone')

  if (reasons.length === 0) {
    return { score: 0, reasons }
  }

  if (exactPhone || exactEmail) {
    return { score: 95, reasons }
  }

  return { score: 70, reasons }
}
