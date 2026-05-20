import {
  normalizeRegistrationMethods,
  createBotEvent,
  updateBotEvent,
  mapBotEventToAdminEvent,
  toBotEventPayload
} from '../../../utils/eventsApi'
import { syncEventEmailAudience } from '../../../utils/newsletterApi'
import { recordAdminAudit } from '../../../utils/adminApi'
import { normalizeCategory } from './eventManagerUtils'

const audit = (action, details = {}) => {
  recordAdminAudit({ action, resource: 'content.event', details }).catch(() => {})
}

const syncEmailAudience = async (eventRecord) => {
  try {
    const syncResult = await syncEventEmailAudience(eventRecord)
    return syncResult?.message || `Event communication audience synced for ${syncResult?.recipientCount || 0} recipients.`
  } catch {
    return 'Event saved, but email audience sync is currently unavailable.'
  }
}

export function useEventSubmit({ currentUser, canWrite, setNotice, refreshEvents, resetForm }) {
  const handleSubmitWithData = async (formData, view) => {
    if (!canWrite) {
      setNotice({ tone: 'error', text: 'Your role cannot modify events.' })
      return
    }

    const title = formData.title.trim()
    const description = formData.description.trim()
    const location = formData.location.trim()
    const category = normalizeCategory(formData.category)

    if (!title || !description || !location || !formData.date || !formData.time || !category) {
      setNotice({ tone: 'error', text: 'Title, description, date, time, and location are required.' })
      return
    }

    if (formData.capacity && Number(formData.capacity) <= 0) {
      setNotice({ tone: 'error', text: 'Capacity must be greater than zero.' })
      return
    }

    const registrationMethods = normalizeRegistrationMethods(formData.registrationMethods)
    const whatsappPhoneDigits = registrationMethods.whatsapp.phone.replace(/\D/g, '')
    const paymentUrl = registrationMethods.payment.url

    if (formData.registrationRequired) {
      const hasMethod = registrationMethods.whatsapp.enabled || registrationMethods.payment.enabled
      if (!hasMethod) {
        setNotice({ tone: 'error', text: 'Enable at least one registration method (WhatsApp or payment).' })
        return
      }
      if (registrationMethods.whatsapp.enabled && whatsappPhoneDigits.length < 10) {
        setNotice({ tone: 'error', text: 'Enter a valid WhatsApp number for registration.' })
        return
      }
      if (registrationMethods.payment.enabled && !/^https?:\/\//i.test(paymentUrl)) {
        setNotice({ tone: 'error', text: 'Enter a valid payment URL starting with http:// or https://.' })
        return
      }
    }

    const nowIso = new Date().toISOString()
    const normalizedTags = Array.from(new Set(
      (formData.whatToExpect || []).map((tag) => String(tag || '').trim()).filter(Boolean)
    ))

    const normalized = {
      ...formData,
      title,
      description,
      location,
      category,
      capacity: formData.capacity ? String(formData.capacity) : '',
      registrationLink: String(formData.registrationLink || '/contact').trim() || '/contact',
      registrationMethods,
      whatToExpect: normalizedTags,
      scheduledPublishAt: formData.scheduledPublishAt ? new Date(formData.scheduledPublishAt).toISOString() : '',
      publishedAt: formData.status === 'published' ? (formData.publishedAt || nowIso) : formData.publishedAt || '',
      workflow: {
        ...(formData.workflow || {}),
        submittedAt: formData.status === 'pending_review'
          ? (formData.workflow?.submittedAt || nowIso) : formData.workflow?.submittedAt || '',
        reviewedBy: (formData.status === 'approved' || formData.status === 'published')
          ? (currentUser?.email || formData.workflow?.reviewedBy || '') : formData.workflow?.reviewedBy || '',
        approvedBy: (formData.status === 'approved' || formData.status === 'published')
          ? (currentUser?.email || formData.workflow?.approvedBy || '') : formData.workflow?.approvedBy || ''
      },
      updatedAt: nowIso
    }

    const payload = toBotEventPayload(normalized)

    try {
      if (view === 'create') {
        const created = await createBotEvent(payload)
        const mapped = mapBotEventToAdminEvent(created)
        await refreshEvents({ silent: true, suppressErrorNotice: true })
        const syncMessage = await syncEmailAudience(mapped)
        setNotice({ tone: 'success', text: `Event created and synced to bot API. ${syncMessage}` })
        audit('event.create', { id: mapped.id, status: mapped.status })
      } else if (view === 'edit') {
        const updatedRemote = await updateBotEvent(formData.id, payload)
        const mapped = mapBotEventToAdminEvent(updatedRemote)
        await refreshEvents({ silent: true, suppressErrorNotice: true })
        const syncMessage = await syncEmailAudience(mapped)
        setNotice({ tone: 'success', text: `Event updated and synced to bot API. ${syncMessage}` })
        audit('event.update', { id: mapped.id, status: mapped.status })
      }
      resetForm()
    } catch (error) {
      setNotice({ tone: 'error', text: error?.message || 'Unable to save this event to the bot API right now.' })
    }
  }

  return { handleSubmitWithData }
}
