import { updateVisitorSubscription, markDoNotContact, getVisitorByPhone } from './visitor.repository.js'
import { logger } from '../lib/logger.js'

const OPT_OUT_KEYWORDS = ['stop', 'unsubscribe', 'cancel', 'quit', 'end', 'optout', 'opt-out']

export const parseOptOutIntent = (messageBody) => {
  if (!messageBody || typeof messageBody !== 'string') {
    return false
  }

  const normalized = messageBody.trim().toLowerCase()
  return OPT_OUT_KEYWORDS.some((keyword) => normalized === keyword || normalized.includes(keyword))
}

export const handleOptOutRequest = async (phoneNumber, reason = 'User requested opt-out via WhatsApp') => {
  try {
    const normalizedPhone = phoneNumber.replace('whatsapp:', '').trim()

    const visitor = await getVisitorByPhone(normalizedPhone)

    if (!visitor) {
      logger.warn('Opt-out request for unknown visitor', { phoneNumber: normalizedPhone })
      return { success: false, message: 'Visitor not found' }
    }

    if (!visitor.is_subscribed) {
      logger.info('Visitor already unsubscribed', { phoneNumber: normalizedPhone })
      return { success: true, message: 'Already unsubscribed' }
    }

    await updateVisitorSubscription(normalizedPhone, false)
    await markDoNotContact(normalizedPhone, reason)

    logger.info('Visitor opted out successfully', { phoneNumber: normalizedPhone, visitorId: visitor.id })

    return {
      success: true,
      message: 'Successfully unsubscribed',
      visitorId: visitor.id
    }
  } catch (error) {
    logger.error('Failed to process opt-out', { phoneNumber, error: error.message })
    return { success: false, message: 'Failed to process opt-out', error: error.message }
  }
}

export const buildOptOutConfirmationMessage = (name) => {
  return `You have been successfully unsubscribed${name ? `, ${name}` : ''}. You will no longer receive messages from us. To resubscribe, contact us directly.`
}
