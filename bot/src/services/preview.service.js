import { generateServiceReminderMessage, generateEventReminderMessage } from './message-generator.service.js'
import { logger } from '../lib/logger.js'

export const previewServiceReminder = async ({ name, serviceTime, isFirstSunday }) => {
  try {
    const message = await generateServiceReminderMessage({
      name: name || 'Sample Visitor',
      serviceTime: serviceTime || '08:00',
      isFirstSunday: isFirstSunday ?? false
    })

    return {
      preview: true,
      recipient: name || 'Sample Visitor',
      context: {
        type: 'service',
        serviceTime,
        isFirstSunday
      },
      generatedMessage: message,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logger.error('Failed to generate service reminder preview', { error: error.message })
    throw error
  }
}

export const previewEventReminder = async ({ name, eventTitle, eventDate }) => {
  try {
    const message = await generateEventReminderMessage({
      name: name || 'Sample Visitor',
      eventTitle: eventTitle || 'Sample Event',
      eventDate: eventDate || new Date().toISOString().split('T')[0]
    })

    return {
      preview: true,
      recipient: name || 'Sample Visitor',
      context: {
        type: 'event',
        eventTitle,
        eventDate
      },
      generatedMessage: message,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logger.error('Failed to generate event reminder preview', { error: error.message })
    throw error
  }
}

export const previewBulkMessages = async ({ visitors, context, limit = 5 }) => {
  const previews = []
  const sampleVisitors = visitors.slice(0, limit)

  for (const visitor of sampleVisitors) {
    let message

    if (context.type === 'service') {
      message = await generateServiceReminderMessage({
        name: visitor.name,
        serviceTime: context.serviceTime,
        isFirstSunday: context.isFirstSunday
      })
    } else if (context.type === 'event') {
      message = await generateEventReminderMessage({
        name: visitor.name,
        eventTitle: context.eventTitle,
        eventDate: context.eventDate
      })
    }

    previews.push({
      visitorId: visitor.id,
      name: visitor.name,
      phoneNumber: visitor.phone_number,
      message
    })
  }

  return {
    preview: true,
    totalVisitors: visitors.length,
    sampleSize: previews.length,
    previews,
    timestamp: new Date().toISOString()
  }
}
