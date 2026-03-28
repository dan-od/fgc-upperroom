import { generateServiceReminderMessage, generateEventReminderMessage } from './message-generator.service.js'
import { renderTemplateByKey } from './template.repository.js'
import { logger } from '../lib/logger.js'

export const previewServiceReminder = async ({ name, serviceTime, isFirstSunday, useFallbackTemplate = false }) => {
  try {
    const previewName = name || 'Sample Visitor'
    const previewServiceTime = serviceTime || '08:00'
    const previewFirstSunday = isFirstSunday ?? false

    const message = useFallbackTemplate
      ? (await renderTemplateByKey('service_reminder', {
          name: previewName,
          serviceTime: previewServiceTime,
          specialLine: previewFirstSunday ? "It's First Sunday tomorrow, and we have something special lined up." : ''
        }).catch(() => null)) ||
        await generateServiceReminderMessage({
          name: previewName,
          serviceTime: previewServiceTime,
          isFirstSunday: previewFirstSunday
        })
      : await generateServiceReminderMessage({
          name: previewName,
          serviceTime: previewServiceTime,
          isFirstSunday: previewFirstSunday
        })

    return {
      preview: true,
      recipient: previewName,
      context: {
        type: 'service',
        serviceTime: previewServiceTime,
        isFirstSunday: previewFirstSunday
      },
      generatedMessage: message,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logger.error('Failed to generate service reminder preview', { error: error.message })
    throw error
  }
}

export const previewEventReminder = async ({ name, eventTitle, eventDate, eventTime, registrationLink, useFallbackTemplate = false }) => {
  try {
    const previewName = name || 'Sample Visitor'
    const previewEventTitle = eventTitle || 'Sample Event'
    const previewEventDate = eventDate || new Date().toISOString().split('T')[0]
    const previewEventTime = eventTime || ''
    const previewRegistrationLink = registrationLink || ''

    const message = useFallbackTemplate
      ? (await renderTemplateByKey('event_reminder', {
          name: previewName,
          eventTitle: previewEventTitle,
          eventDate: previewEventDate,
          eventTimeLine: previewEventTime ? `It starts at ${previewEventTime}.` : '',
          registrationLine: previewRegistrationLink ? `Register here: ${previewRegistrationLink}.` : ''
        }).catch(() => null)) ||
        await generateEventReminderMessage({
          name: previewName,
          eventTitle: previewEventTitle,
          eventDate: previewEventDate,
          eventTime: previewEventTime,
          registrationLink: previewRegistrationLink
        })
      : await generateEventReminderMessage({
          name: previewName,
          eventTitle: previewEventTitle,
          eventDate: previewEventDate,
          eventTime: previewEventTime,
          registrationLink: previewRegistrationLink
        })

    return {
      preview: true,
      recipient: previewName,
      context: {
        type: 'event',
        eventTitle: previewEventTitle,
        eventDate: previewEventDate,
        eventTime: previewEventTime,
        registrationLink: previewRegistrationLink
      },
      generatedMessage: message,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    logger.error('Failed to generate event reminder preview', { error: error.message })
    throw error
  }
}

export const previewBulkMessages = async ({ visitors, context, limit = 5, useFallbackTemplate = false }) => {
  const previews = []
  const sampleVisitors = visitors.slice(0, limit)

  for (const visitor of sampleVisitors) {
    let message

    if (context.type === 'service') {
      message = useFallbackTemplate
        ? (await renderTemplateByKey('service_reminder', {
            name: visitor.name,
            serviceTime: context.serviceTime,
            specialLine: context.isFirstSunday ? "It's First Sunday tomorrow, and we have something special lined up." : ''
          }).catch(() => null)) ||
          await generateServiceReminderMessage({
            name: visitor.name,
            serviceTime: context.serviceTime,
            isFirstSunday: context.isFirstSunday
          })
        : await generateServiceReminderMessage({
            name: visitor.name,
            serviceTime: context.serviceTime,
            isFirstSunday: context.isFirstSunday
          })
    } else if (context.type === 'event') {
      message = useFallbackTemplate
        ? (await renderTemplateByKey('event_reminder', {
            name: visitor.name,
            eventTitle: context.eventTitle,
            eventDate: context.eventDate,
            eventTimeLine: context.eventTime ? `It starts at ${context.eventTime}.` : '',
            registrationLine: context.registrationLink ? `Register here: ${context.registrationLink}.` : ''
          }).catch(() => null)) ||
          await generateEventReminderMessage({
            name: visitor.name,
            eventTitle: context.eventTitle,
            eventDate: context.eventDate,
            eventTime: context.eventTime,
            registrationLink: context.registrationLink
          })
        : await generateEventReminderMessage({
            name: visitor.name,
            eventTitle: context.eventTitle,
            eventDate: context.eventDate,
            eventTime: context.eventTime,
            registrationLink: context.registrationLink
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
