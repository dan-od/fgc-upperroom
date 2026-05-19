import {
  createDefaultRegistrationMethods,
  normalizeRegistrationMethods,
  fetchBotEvents,
  deleteBotEvent,
  updateBotEvent,
  mapBotEventToAdminEvent,
  toBotEventPayload
} from '../../../utils/eventsApi'
import { recordAdminAudit } from '../../../utils/adminApi'
import {
  normalizeCategory,
  mergeCategories,
  buildCategoriesFromEvents,
  applyScheduledEventTransitions
} from './eventManagerUtils'
import { useEventWorkflow } from './useEventWorkflow'
import { useEventBulk } from './useEventBulk'
import { useEventSubmit } from './useEventSubmit'

const audit = (action, details = {}) => {
  recordAdminAudit({ action, resource: 'content.event', details }).catch(() => {})
}

export function useEventCrud({
  currentUser,
  hasPermission,
  events,
  setEvents,
  setNotice,
  categories,
  setCategories,
  setView,
  setFormData,
  setTagInput,
  setNewCategoryInput,
  setIsLoading,
  openModal
}) {
  const canWrite = hasPermission('content:event:write') || hasPermission('content:event:publish')
  const canPublish = hasPermission('content:event:publish')
  const canApprove = hasPermission('content:event:approve')

  const saveEvents = (updatedEvents, categoryBase = categories) => {
    const scheduled = applyScheduledEventTransitions(updatedEvents)
    setEvents(scheduled.events)
    const combinedCategories = buildCategoriesFromEvents(scheduled.events, categoryBase)
    setCategories(combinedCategories)
    window.dispatchEvent(new CustomEvent('adminEventsUpdated'))
    return scheduled.events
  }

  const refreshEvents = async ({ silent = false, suppressErrorNotice = false } = {}) => {
    if (!silent) setIsLoading(true)
    try {
      const botEvents = await fetchBotEvents()
      let normalized = botEvents.map(mapBotEventToAdminEvent)
      const scheduled = applyScheduledEventTransitions(normalized)

      if (scheduled.changed) {
        const originalById = new Map(normalized.map((event) => [String(event.id), event]))
        const dueEvents = scheduled.events.filter((event) => {
          const original = originalById.get(String(event.id))
          return original && original.status !== event.status
        })

        if (dueEvents.length > 0) {
          await Promise.all(dueEvents.map((event) => updateBotEvent(event.id, toBotEventPayload(event))))
          const syncedEvents = await fetchBotEvents()
          normalized = syncedEvents.map(mapBotEventToAdminEvent)
        } else {
          normalized = scheduled.events
        }
      }

      return saveEvents(normalized)
    } catch (error) {
      if (!suppressErrorNotice) {
        setNotice({ tone: 'error', text: error?.message || 'Unable to load events from the bot API right now.' })
      }
      throw error
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  const makeBlankFormData = () => ({
    id: Date.now(),
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    category: 'general',
    capacity: '',
    registrationRequired: false,
    registrationLink: '/contact',
    registrationMethods: createDefaultRegistrationMethods(),
    status: 'draft',
    scheduledPublishAt: '',
    publishedAt: '',
    workflow: { submittedAt: '', reviewedBy: '', approvedBy: '', rejectedReason: '' },
    versions: [],
    whatToExpect: [],
    imageUrl: '',
    createdAt: null,
    updatedAt: null
  })

  const resetForm = () => {
    setFormData(makeBlankFormData())
    setTagInput('')
    setNewCategoryInput('')
    setView('list')
  }

  const handleEdit = (event) => {
    setNotice(null)
    setTagInput('')
    const normalizedCategory = normalizeCategory(event?.category) || 'general'
    const merged = mergeCategories(categories, [normalizedCategory])
    setCategories(merged)
    setFormData({
      ...event,
      category: normalizedCategory,
      registrationLink: String(event?.registrationLink || '/contact').trim() || '/contact',
      registrationMethods: normalizeRegistrationMethods(event?.registrationMethods),
      whatToExpect: Array.isArray(event.whatToExpect) ? event.whatToExpect : []
    })
    setView('edit')
  }

  const handleDelete = async (id) => {
    if (!canWrite) {
      setNotice({ tone: 'error', text: 'Your role cannot delete events.' })
      return
    }
    const eventToDelete = events.find((evt) => String(evt.id) === String(id))
    const message = eventToDelete
      ? `Delete "${eventToDelete.title}"? This action cannot be undone.`
      : 'Delete this event? This action cannot be undone.'

    openModal({
      title: 'Delete Event',
      message,
      tone: 'danger',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await deleteBotEvent(id)
          await refreshEvents({ silent: true, suppressErrorNotice: true })
          setNotice({ tone: 'success', text: 'Event deleted successfully.' })
          audit('event.delete', { id })
        } catch (error) {
          setNotice({ tone: 'error', text: error?.message || 'Unable to delete this event right now.' })
        }
      }
    })
  }

  const submit = useEventSubmit({ currentUser, canWrite, setNotice, refreshEvents, resetForm })

  const workflow = useEventWorkflow({
    events,
    setNotice,
    currentUser,
    canWrite,
    canApprove,
    canPublish,
    refreshEvents,
    openModal
  })

  const bulk = useEventBulk({
    events,
    setNotice,
    canWrite,
    canPublish,
    refreshEvents,
    openModal
  })

  return {
    canWrite,
    canPublish,
    canApprove,
    saveEvents,
    refreshEvents,
    resetForm,
    makeBlankFormData,
    handleEdit,
    handleDelete,
    ...submit,
    ...workflow,
    ...bulk
  }
}
