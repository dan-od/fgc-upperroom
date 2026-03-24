import express from 'express'
import cors from 'cors'
import crypto from 'node:crypto'

import { env } from './config/env.js'
import { logger } from './lib/logger.js'
import { recordHttpMetric } from './services/telemetry.service.js'
import visitorRoutes from './routes/visitors.js'
import eventRoutes from './routes/events.js'
import messageRoutes from './routes/messages.js'
import importRoutes from './routes/import.js'
import previewRoutes from './routes/preview.js'
import adminRoutes from './routes/admin.js'
import monitoringRoutes from './routes/monitoring.js'
import attendanceHistoryRoutes from './routes/attendance-history.js'
import prayerRequestRoutes from './routes/prayer-requests.js'
import memberRoutes from './routes/members.js'
import privacyRoutes from './routes/privacy.js'

export const createBotApp = () => {
  const app = express()

  app.disable('x-powered-by')
  app.use(cors())
  app.use(express.json({ limit: '1mb' }))
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('X-Frame-Options', 'DENY')
    res.setHeader('Referrer-Policy', 'no-referrer')
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
    next()
  })
  app.use((req, res, next) => {
    const requestId = String(req.headers['x-request-id'] || crypto.randomUUID())
    const startedAt = process.hrtime.bigint()
    res.setHeader('x-request-id', requestId)

    res.on('finish', () => {
      const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
      recordHttpMetric({
        durationMs,
        statusCode: res.statusCode,
        slowThresholdMs: env.MONITORING_SLOW_REQUEST_MS
      })

      const message = durationMs >= env.MONITORING_SLOW_REQUEST_MS ? 'Slow HTTP request' : 'HTTP request'
      const level = res.statusCode >= 500 ? 'error' : durationMs >= env.MONITORING_SLOW_REQUEST_MS ? 'warn' : 'info'
      logger[level](message, {
        requestId,
        method: req.method,
        path: req.originalUrl,
        statusCode: res.statusCode,
        durationMs: Number(durationMs.toFixed(2))
      })
    })

    next()
  })

  app.get('/bot/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'church-whatsapp-bot',
      timezone: env.TIMEZONE,
      now: new Date().toISOString()
    })
  })

  app.use('/bot/api/visitors', visitorRoutes)
  app.use('/bot/api/events', eventRoutes)
  app.use('/bot/api/messages', messageRoutes)
  app.use('/bot/api/attendance-history', attendanceHistoryRoutes)
  app.use('/bot/api/prayer-requests', prayerRequestRoutes)
  app.use('/bot/api/members', memberRoutes)
  app.use('/bot/api/privacy', privacyRoutes)
  app.use('/bot/api', importRoutes)
  app.use('/bot/api', previewRoutes)
  app.use('/bot/api/admin', adminRoutes)
  app.use('/bot/monitoring', monitoringRoutes)

  // Meta webhook verification (GET) — called once when you register the webhook URL
  app.get('/bot/webhooks/whatsapp', (req, res) => {
    const mode = req.query['hub.mode']
    const token = req.query['hub.verify_token']
    const challenge = req.query['hub.challenge']

    if (mode === 'subscribe' && token === env.META_WEBHOOK_VERIFY_TOKEN) {
      logger.info('Meta webhook verified successfully')
      return res.status(200).send(challenge)
    }

    logger.warn('Meta webhook verification failed', { mode, token })
    res.status(403).send('Forbidden')
  })

  // Meta webhook events (POST) — inbound messages + delivery statuses
  app.post('/bot/webhooks/whatsapp', async (req, res) => {
    try {
      // Always acknowledge immediately — Meta retries if it doesn't get 200 quickly
      res.status(200).json({ received: true })

      const body = req.body
      const changes = body?.entry?.[0]?.changes?.[0]?.value

      if (!changes) return

      // ── Delivery status updates ──────────────────────────────────────────
      if (changes.statuses?.length) {
        const { updateMessageStatus } = await import('./services/message.repository.js')
        const { recordDeliveryFailure, recordDeliverySuccess } = await import('./services/visitor.repository.js')
        for (const status of changes.statuses) {
          logger.info('Meta delivery status', { wamid: status.id, status: status.status, recipient: status.recipient_id })
          if (status.id) {
            await updateMessageStatus(status.id, status.status, status?.errors?.[0]?.title || null)
          }

          const recipientRaw = String(status.recipient_id || '').replace(/\D/g, '')
          const normalizedRecipient = recipientRaw ? `+${recipientRaw}` : ''
          if (!normalizedRecipient) continue

          if (['failed', 'undelivered'].includes(String(status.status || '').toLowerCase())) {
            await recordDeliveryFailure(normalizedRecipient, {
              reason: status?.errors?.[0]?.title || 'provider_delivery_failed',
              blockAfter: 3,
              blockHours: 24
            }).catch(() => {})
          } else if (['sent', 'delivered', 'read'].includes(String(status.status || '').toLowerCase())) {
            await recordDeliverySuccess(normalizedRecipient).catch(() => {})
          }
        }
      }

      // ── Inbound messages ─────────────────────────────────────────────────
      if (changes.messages?.length) {
        const message = changes.messages[0]
        const from = message.from           // E.164 without +, e.g. "2347080551309"
        const text = message.text?.body     // message body text
        const wamid = message.id

        logger.info('Received inbound WhatsApp message', { from, text, wamid })

        if (!from || !text) return

        const { parseOptOutIntent, handleOptOutRequest, buildOptOutConfirmationMessage } = await import('./services/opt-out.service.js')
        const { handleInboundConversation } = await import('./services/inbound-conversation.service.js')
        const { sendWhatsAppMessage } = await import('./services/whatsapp.service.js')
        const { getVisitorByPhone } = await import('./services/visitor.repository.js')
        const { logMessageSent } = await import('./services/message.repository.js')

        const isOptOut = parseOptOutIntent(text)

        if (isOptOut) {
          const result = await handleOptOutRequest(from, `User sent: ${text}`)

          if (result.success) {
            const visitor = await getVisitorByPhone(from)
            const confirmationMsg = buildOptOutConfirmationMessage(visitor?.name)

            await sendWhatsAppMessage({
              to: from,
              body: confirmationMsg
            })
          }
        } else {
          const response = await handleInboundConversation({
            fromPhoneNumber: from,
            messageText: text
          })

          if (response?.handled && response?.replyText) {
            const visitor = await getVisitorByPhone(from)
            const jobId = `inbound-reply-${Date.now()}`
            const result = await sendWhatsAppMessage({
              to: from,
              body: response.replyText,
              jobId
            })

            await logMessageSent({
              jobId,
              visitorId: visitor?.id || null,
              providerMessageId: result.providerMessageId,
              providerName: result.provider || 'unknown',
              messageType: 'text',
              messageText: response.replyText,
              status: result.status || 'sent'
            }).catch(() => {})
          }
        }
      }
    } catch (error) {
      logger.error('Webhook processing error', { error: error.message })
    }
  })

  return app
}
