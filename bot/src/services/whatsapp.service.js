import { logger } from '../lib/logger.js'
import { env } from '../config/env.js'

// Non-retryable Meta error codes — permanent failures, do not retry
const META_PERMANENT_ERRORS = new Set([131026, 131047, 131051, 131052])
const META_RATE_LIMIT_ERRORS = new Set([130429, 131056])
const SUPPORTED_MEDIA_TYPES = new Set(['image', 'video', 'document'])

const circuitBreaker = {
  state: 'closed', // closed | open | half-open
  openedAt: 0,
  consecutiveFailures: 0
}

const isPlaceholderValue = (value) => {
  const normalized = String(value || '').trim()
  if (!normalized) {
    return true
  }

  return /x{6,}/i.test(normalized) || /your[_-]/i.test(normalized) || /example/i.test(normalized)
}

const isCircuitOpen = () => {
  if (circuitBreaker.state !== 'open') {
    return false
  }

  const cooldownMs = Math.max(10_000, Number(env.WHATSAPP_CIRCUIT_COOLDOWN_MS) || 120_000)
  if (Date.now() - circuitBreaker.openedAt >= cooldownMs) {
    circuitBreaker.state = 'half-open'
    return false
  }

  return true
}

const registerProviderSuccess = () => {
  circuitBreaker.consecutiveFailures = 0
  circuitBreaker.state = 'closed'
}

const registerProviderFailure = () => {
  circuitBreaker.consecutiveFailures += 1
  const threshold = Math.max(2, Number(env.WHATSAPP_CIRCUIT_FAILURE_THRESHOLD) || 5)
  if (circuitBreaker.consecutiveFailures >= threshold) {
    circuitBreaker.state = 'open'
    circuitBreaker.openedAt = Date.now()
  }
}

export const sendWhatsAppMessage = async ({ to, body, templateName, templateParams, media, jobId }) => {
  if (isCircuitOpen()) {
    return {
      provider: 'circuit-breaker',
      providerMessageId: null,
      status: 'failed',
      transient: true,
      error: 'WhatsApp provider temporarily paused due to repeated failures.'
    }
  }

  if (env.WHATSAPP_PROVIDER === 'meta') {
    const result = await sendViaMeta({ to, body, templateName, templateParams, media, jobId })
    if (result.status === 'sent') {
      registerProviderSuccess()
      return result
    }

    if (!result.permanent) {
      registerProviderFailure()
      if (env.WHATSAPP_FALLBACK_PROVIDER === 'stub') {
        logger.warn('Primary provider failed, using fallback provider', { to, jobId, reason: result.error })
        return sendStub({ to, body, media, jobId, provider: 'stub-fallback' })
      }
    }

    return result
  }

  logger.warn('No WhatsApp provider configured, using stub')
  return sendStub({ to, body, media, jobId })
}

/**
 * Build the JSON payload for a template message
 * templateParams: array of string values for {{1}}, {{2}}, ...
 */
const buildTemplatePayload = (to, templateName, templateParams = []) => ({
  messaging_product: 'whatsapp',
  to,
  type: 'template',
  template: {
    name: templateName,
    language: { code: 'en' },
    components: templateParams.length > 0
      ? [{
          type: 'body',
          parameters: templateParams.map(text => ({ type: 'text', text: String(text) }))
        }]
      : []
  }
})

/**
 * Build the JSON payload for a free-form text message
 * Only valid within a 24-hour customer-service window
 */
const buildTextPayload = (to, body) => ({
  messaging_product: 'whatsapp',
  to,
  type: 'text',
  text: { body: String(body) }
})

const buildMediaPayload = (to, body, media = {}) => {
  const mediaType = SUPPORTED_MEDIA_TYPES.has(String(media?.type || '').toLowerCase())
    ? String(media.type).toLowerCase()
    : 'image'
  const link = String(media?.url || media?.link || '').trim()
  const caption = String(media?.caption || body || '').trim()

  const payload = {
    messaging_product: 'whatsapp',
    to,
    type: mediaType,
    [mediaType]: {
      link
    }
  }

  if (caption && (mediaType === 'image' || mediaType === 'video' || mediaType === 'document')) {
    payload[mediaType].caption = caption
  }

  if (mediaType === 'document' && media?.filename) {
    payload[mediaType].filename = String(media.filename)
  }

  return payload
}

const sendViaMeta = async ({ to, body, templateName, templateParams, media, jobId }, retryCount = 0) => {
  if (isPlaceholderValue(env.META_ACCESS_TOKEN) || isPlaceholderValue(env.META_PHONE_NUMBER_ID)) {
    logger.warn('Meta credentials not configured, using stub mode')
    return sendStub({ to, body, media, jobId })
  }

  // Normalise phone: strip leading + if present
  const normalised = String(to).replace(/^\+/, '')

  const payload = templateName
    ? buildTemplatePayload(normalised, templateName, templateParams)
    : media?.url || media?.link
      ? buildMediaPayload(normalised, body, media)
      : buildTextPayload(normalised, body)

  const url = `https://graph.facebook.com/${env.META_API_VERSION}/${env.META_PHONE_NUMBER_ID}/messages`

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.META_ACCESS_TOKEN}`
      },
      body: JSON.stringify(payload)
    })

    const data = await response.json()

    if (!response.ok) {
      const metaCode = data?.error?.code
      const metaMessage = data?.error?.message || 'Unknown error'

      // Permanent failures — do not retry
      if (META_PERMANENT_ERRORS.has(metaCode)) {
        logger.warn('Meta API permanent failure', { to, jobId, code: metaCode, message: metaMessage })
        return { provider: 'meta', providerMessageId: null, status: 'failed', permanent: true, error: metaMessage }
      }

      // Rate limit — retry with backoff
      if ((response.status === 429 || META_RATE_LIMIT_ERRORS.has(metaCode)) && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 2000
        logger.warn(`Meta rate limit hit, retrying in ${delay}ms`, { to, jobId, attempt: retryCount + 1 })
        await new Promise(resolve => setTimeout(resolve, delay))
        return sendViaMeta({ to, body, templateName, templateParams, media, jobId }, retryCount + 1)
      }

      logger.error('Meta API error', { status: response.status, code: metaCode, message: metaMessage, to, jobId })
      return {
        provider: 'meta',
        providerMessageId: null,
        status: 'failed',
        rateLimited: response.status === 429 || META_RATE_LIMIT_ERRORS.has(metaCode),
        error: metaMessage
      }
    }

    const wamid = data?.messages?.[0]?.id
    logger.info('Message sent via Meta WhatsApp', { to, jobId, wamid })
    return { provider: 'meta', providerMessageId: wamid, status: 'sent' }

  } catch (error) {
    logger.error('Failed to send via Meta', { to, error: error.message, jobId })
    return { provider: 'meta', providerMessageId: null, status: 'failed', transient: true, error: error.message }
  }
}

const sendStub = async ({ to, body, media, jobId, provider = 'stub' }) => {
  logger.info('Sending WhatsApp message (stub mode)', {
    to,
    bodyPreview: String(body || '').slice(0, 100),
    hasMedia: Boolean(media?.url || media?.link),
    jobId
  })
  return {
    provider,
    providerMessageId: `stub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    status: 'sent'
  }
}
