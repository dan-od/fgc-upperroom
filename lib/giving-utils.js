import crypto from 'node:crypto'

const GIVING_STATUS_RANK = {
  pending: 0,
  abandoned: 1,
  failed: 2,
  success: 3
}

export const normalizeGivingStatus = (value) => {
  const normalized = String(value || '').trim().toLowerCase()
  if (normalized in GIVING_STATUS_RANK) return normalized
  return 'pending'
}

export const resolveGivingStatus = (currentStatus, nextStatus) => {
  const current = normalizeGivingStatus(currentStatus)
  const next = normalizeGivingStatus(nextStatus)
  return GIVING_STATUS_RANK[next] >= GIVING_STATUS_RANK[current] ? next : current
}

export const toKobo = (value) => {
  const amount = Number(value)
  if (!Number.isFinite(amount)) return NaN
  return Math.round(amount * 100)
}

export const buildGivingReference = (prefix = 'URG') => {
  const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14)
  const rand = crypto.randomBytes(4).toString('hex').toUpperCase()
  return `${String(prefix || 'URG').toUpperCase()}-${ts}-${rand}`
}

export const verifyPaystackSignature = ({ rawBody, signature, secretKey }) => {
  const body = String(rawBody || '')
  const sig = String(signature || '').trim()
  const secret = String(secretKey || '').trim()
  if (!body || !sig || !secret) return false
  const digest = crypto.createHmac('sha512', secret).update(body).digest('hex')
  return sig === digest
}

export const mapPaystackEventToStatus = (eventName = '') => {
  const event = String(eventName || '').trim().toLowerCase()
  if (event === 'charge.success') return 'success'
  if (event === 'charge.failed') return 'failed'
  if (event === 'charge.abandoned') return 'abandoned'
  return 'pending'
}

export const isEthAddress = (address) => {
  return /^0x[a-fA-F0-9]{40}$/.test(String(address || ''))
}

export const toWeiString = (amountNaira) => {
  // Rough conversion or exact mapping if using a stablecoin. 
  // For this project, we assume NGN amount is just a reference, 
  // but if they pay in ETH, we'd need a price feed.
  // HOWEVER,church usually wants stablecoins like USDT.
  // We'll treat the 'value' on-chain in Wei for ETH or just use the raw hex for comparison.
  const amount = Number(amountNaira)
  if (!Number.isFinite(amount)) return '0'
  return (BigInt(Math.round(amount)) * 10n ** 14n).toString() // Just a placeholder conversion
}
