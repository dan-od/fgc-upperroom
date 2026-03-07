import express from 'express'
import cors from 'cors'

import { env } from './config/env.js'
import { logger } from './lib/logger.js'
import visitorRoutes from './routes/visitors.js'
import eventRoutes from './routes/events.js'
import messageRoutes from './routes/messages.js'
import importRoutes from './routes/import.js'
import previewRoutes from './routes/preview.js'
import adminRoutes from './routes/admin.js'
import monitoringRoutes from './routes/monitoring.js'

export const createBotApp = () => {
  const app = express()

  app.use(cors())
  app.use(express.json({ limit: '1mb' }))

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
        for (const status of changes.statuses) {
          logger.info('Meta delivery status', { wamid: status.id, status: status.status, recipient: status.recipient_id })
          if (status.id) {
            await updateMessageStatus(status.id, status.status, null)
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
        const { sendWhatsAppMessage } = await import('./services/whatsapp.service.js')
        const { getVisitorByPhone } = await import('./services/visitor.repository.js')

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
        }
      }
    } catch (error) {
      logger.error('Webhook processing error', { error: error.message })
    }
  })

  return app
}
