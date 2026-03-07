import { logger } from '../lib/logger.js'
import { env } from '../config/env.js'

// Non-retryable Meta error codes — permanent failures, do not retry
const META_PERMANENT_ERRORS = new Set([131026, 131047, 131051, 131052])

export const sendWhatsAppMessage = async ({ to, body, templateName, templateParams, jobId }) => {
  if (env.WHATSAPP_PROVIDER === 'meta') {
    return sendViaMeta({ to, body, templateName, templateParams, jobId })
  }

  logger.warn('No WhatsApp provider configured, using stub')
  return sendStub({ to, body, jobId })
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

const sendViaMeta = async ({ to, body, templateName, templateParams, jobId }, retryCount = 0) => {
  if (!env.META_ACCESS_TOKEN || !env.META_PHONE_NUMBER_ID) {
    logger.warn('Meta credentials not configured, using stub mode')
    return sendStub({ to, body, jobId })
  }

  // Normalise phone: strip leading + if present
  const normalised = String(to).replace(/^\+/, '')

  const payload = templateName
    ? buildTemplatePayload(normalised, templateName, templateParams)
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
        return { providerMessageId: null, status: 'failed', permanent: true }
      }

      // Rate limit — retry with backoff
      if ((response.status === 429 || metaCode === 130429 || metaCode === 131056) && retryCount < 3) {
        const delay = Math.pow(2, retryCount) * 2000
        logger.warn(`Meta rate limit hit, retrying in ${delay}ms`, { to, jobId, attempt: retryCount + 1 })
        await new Promise(resolve => setTimeout(resolve, delay))
        return sendViaMeta({ to, body, templateName, templateParams, jobId }, retryCount + 1)
      }

      logger.error('Meta API error', { status: response.status, code: metaCode, message: metaMessage, to, jobId })
      return { providerMessageId: null, status: 'failed' }
    }

    const wamid = data?.messages?.[0]?.id
    logger.info('Message sent via Meta WhatsApp', { to, jobId, wamid })
    return { providerMessageId: wamid, status: 'sent' }

  } catch (error) {
    logger.error('Failed to send via Meta', { to, error: error.message, jobId })
    return { providerMessageId: null, status: 'failed' }
  }
}

const sendStub = async ({ to, body, jobId }) => {
  logger.info('Sending WhatsApp message (stub mode)', { to, bodyPreview: String(body || '').slice(0, 100), jobId })
  return {
    providerMessageId: `stub-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    status: 'sent'
  }
}
