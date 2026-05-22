import express from 'express'
import { assertAdmin } from '../lib/admin-auth.js'
import { getVisitorByPhone } from '../services/visitor.repository.js'
import { sendWhatsAppMessage } from '../services/whatsapp.service.js'
import { logMessageSent } from '../services/message.repository.js'
import { renderTemplateByKey } from '../services/template.repository.js'
import { normalizePhoneNumber, isValidPhoneNumber } from '../services/identity.service.js'
import { logger } from '../lib/logger.js'
import { maskPhone } from '../utils/privacy.js'

const router = express.Router()

const formatFundName = (fund) => {
  if (!fund || fund === 'general') return 'General'
  return String(fund)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

router.post('/notify', async (req, res) => {
  if (!assertAdmin(req, res)) return

  const { reference, amount_kobo, currency, fund, donor_name, donor_phone, donor_email, paid_at } = req.body

  if (!reference) {
    return res.status(400).json({ error: 'reference is required.' })
  }

  const rawPhone = String(donor_phone || '').trim()
  if (!rawPhone) {
    logger.info('[giving-notify] No donor_phone — skipping WhatsApp notification', { reference })
    return res.json({ ok: true, notified: false, reason: 'no_phone' })
  }

  const normalizedPhone = normalizePhoneNumber(rawPhone)
  if (!isValidPhoneNumber(normalizedPhone)) {
    logger.warn('[giving-notify] Invalid donor phone — skipping', { reference, phone: maskPhone(rawPhone) })
    return res.json({ ok: true, notified: false, reason: 'invalid_phone' })
  }

  try {
    const visitor = await getVisitorByPhone(normalizedPhone)

    if (!visitor) {
      logger.info('[giving-notify] Donor not in visitor list — skipping WhatsApp notification', {
        reference,
        phone: maskPhone(normalizedPhone),
      })
      return res.json({ ok: true, notified: false, reason: 'visitor_not_found' })
    }

    if (!visitor.is_subscribed || visitor.do_not_contact) {
      logger.info('[giving-notify] Donor opted out — skipping WhatsApp notification', {
        reference,
        visitorId: visitor.id,
      })
      return res.json({ ok: true, notified: false, reason: 'opted_out' })
    }

    const amountNaira = Math.round(Number(amount_kobo) || 0) / 100
    const firstName = String(donor_name || visitor.name || '').trim().split(/\s+/)[0] || ''
    const fundLabel = formatFundName(fund)

    const messageText = await renderTemplateByKey('giving_thanks', {
      firstName,
      amountNaira: amountNaira.toLocaleString('en-NG', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
      fund: fundLabel,
      currency: String(currency || 'NGN').toUpperCase(),
    })

    if (!messageText) {
      logger.warn('[giving-notify] giving_thanks template not found — skipping', { reference })
      return res.json({ ok: true, notified: false, reason: 'template_missing' })
    }

    const jobId = `giving-thanks-${reference}`
    const result = await sendWhatsAppMessage({ to: normalizedPhone, body: messageText, jobId })

    await logMessageSent({
      jobId,
      visitorId: visitor.id,
      providerMessageId: result.providerMessageId,
      providerName: result.provider || 'unknown',
      messageType: 'giving_thanks',
      messageText,
      status: result.status || 'sent',
    }).catch(() => {})

    logger.info('[giving-notify] Thank-you message sent', {
      reference,
      visitorId: visitor.id,
      phone: maskPhone(normalizedPhone),
      status: result.status,
    })

    return res.json({ ok: true, notified: true, status: result.status })
  } catch (err) {
    logger.error('[giving-notify] Failed to send thank-you message', { reference, error: err.message })
    return res.status(500).json({ error: 'Failed to send notification.' })
  }
})

export default router
