import { createPrayerRequest } from './prayer.repository.js'
import { createFeedbackEntry } from './feedback.repository.js'
import { getVisitorByPhone } from './visitor.repository.js'
import { renderTemplateByKey } from './template.repository.js'

const normalizeText = (value) => String(value || '').trim()
const toLower = (value) => normalizeText(value).toLowerCase()

const FAQ_MATCHERS = [
  {
    key: 'faq_service_time',
    patterns: ['service time', 'when is service', 'what time is service', 'time for service']
  },
  {
    key: 'faq_location',
    patterns: ['location', 'address', 'where is church', 'where are you located']
  },
  {
    key: 'faq_contact',
    patterns: ['contact', 'phone number', 'how can i reach', 'email address']
  }
]

const isPrayerIntent = (messageText) => {
  const text = toLower(messageText)
  return text.startsWith('prayer') || text.includes('pray for') || text.includes('prayer request')
}

const isFeedbackIntent = (messageText) => {
  const text = toLower(messageText)
  return text.startsWith('feedback') || text.includes('suggestion') || text.includes('complaint')
}

const parsePrayerText = (messageText) => {
  const text = normalizeText(messageText)
  return text.replace(/^prayer\s*:?\s*/i, '').trim() || text
}

const parseFeedbackText = (messageText) => {
  const text = normalizeText(messageText)
  return text.replace(/^feedback\s*:?\s*/i, '').trim() || text
}

const resolveFaqTemplateKey = (messageText) => {
  const text = toLower(messageText)
  for (const matcher of FAQ_MATCHERS) {
    if (matcher.patterns.some((pattern) => text.includes(pattern))) {
      return matcher.key
    }
  }
  return null
}

export const handleInboundConversation = async ({ fromPhoneNumber, messageText } = {}) => {
  const body = normalizeText(messageText)
  if (!body) {
    return { handled: false, replyText: '' }
  }

  const visitor = await getVisitorByPhone(fromPhoneNumber).catch(() => null)
  const visitorName = String(visitor?.name || '').trim() || 'there'

  if (isPrayerIntent(body)) {
    const requestText = parsePrayerText(body)
    await createPrayerRequest({
      visitorId: visitor?.id || null,
      requesterName: visitor?.name || 'WhatsApp User',
      requestText,
      phoneNumber: fromPhoneNumber,
      source: 'whatsapp'
    })

    const replyText =
      (await renderTemplateByKey('prayer_ack', { name: visitorName })) ||
      `Thanks ${visitorName}. We have your prayer request, and the prayer team will keep it in prayer.`

    return {
      handled: true,
      intent: 'prayer_request',
      replyText
    }
  }

  if (isFeedbackIntent(body)) {
    const feedbackText = parseFeedbackText(body)
    await createFeedbackEntry({
      visitorId: visitor?.id || null,
      phoneNumber: fromPhoneNumber,
      feedbackText,
      source: 'whatsapp',
      metadata: { rawMessage: body }
    })

    const replyText =
      (await renderTemplateByKey('feedback_ack', { name: visitorName })) ||
      `Thanks ${visitorName}. We have your feedback and will read it carefully.`

    return {
      handled: true,
      intent: 'feedback',
      replyText
    }
  }

  const faqKey = resolveFaqTemplateKey(body)
  if (faqKey) {
    const replyText = await renderTemplateByKey(faqKey, { name: visitorName })
    if (replyText) {
      return {
        handled: true,
        intent: `faq:${faqKey}`,
        replyText
      }
    }
  }

  const fallbackReply = await renderTemplateByKey('default_auto_reply', { name: visitorName })
  if (fallbackReply) {
    return {
      handled: true,
      intent: 'fallback',
      replyText: fallbackReply
    }
  }

  return {
    handled: true,
    intent: 'fallback',
    replyText: 'Thanks for reaching out to FGC Upper Room. Send PRAYER for prayer requests, FEEDBACK for feedback, or ask about service time, location, or contact details.'
  }
}
