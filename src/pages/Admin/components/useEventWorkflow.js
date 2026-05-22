import { useEffect } from 'react'
import { pushEventVersion, applyScheduledEventTransitions } from './eventManagerUtils'
import { updateBotEvent, toBotEventPayload } from '../../../utils/eventsApi'
import { recordAdminAudit } from '../../../utils/adminApi'

const audit = (action, details = {}) => {
  recordAdminAudit({ action, resource: 'content.event', details }).catch(() => {})
}

export function useEventWorkflow({
  events,
  setNotice,
  currentUser,
  canWrite,
  canApprove,
  canPublish,
  refreshEvents,
  openModal
}) {
  const updateSingleEventWorkflow = async (eventId, updater, successMessage) => {
    const now = new Date().toISOString()
    const currentEvent = events.find((item) => String(item.id) === String(eventId))
    if (!currentEvent) {
      setNotice({ tone: 'error', text: 'Event not found.' })
      return
    }
    const withVersion = pushEventVersion(currentEvent, 'workflow_change')
    const updatedEvent = updater({ ...withVersion, updatedAt: now }, now)
    try {
      await updateBotEvent(updatedEvent.id, toBotEventPayload(updatedEvent))
      await refreshEvents({ silent: true, suppressErrorNotice: true })
      setNotice({ tone: 'success', text: successMessage })
      audit('event.workflow', { id: eventId, action: successMessage })
    } catch (error) {
      setNotice({ tone: 'error', text: error?.message || 'Unable to update the event workflow right now.' })
    }
  }

  const handleSubmitForReview = (event) => {
    if (!canWrite) { setNotice({ tone: 'error', text: 'Your role cannot submit events for review.' }); return }
    void updateSingleEventWorkflow(event.id, (item, now) => ({
      ...item, status: 'pending_review', workflow: { ...(item.workflow || {}), submittedAt: now }
    }), 'Event submitted for review.')
  }

  const handleApproveEvent = (event) => {
    if (!canApprove) { setNotice({ tone: 'error', text: 'Your role cannot approve events.' }); return }
    void updateSingleEventWorkflow(event.id, (item) => ({
      ...item, status: 'approved',
      workflow: { ...(item.workflow || {}), reviewedBy: currentUser?.email || '', approvedBy: currentUser?.email || '' }
    }), 'Event approved.')
  }

  const handlePublishEvent = (event) => {
    if (!canPublish) { setNotice({ tone: 'error', text: 'Your role cannot publish events.' }); return }
    void updateSingleEventWorkflow(event.id, (item, now) => ({
      ...item, status: 'published', publishedAt: now, scheduledPublishAt: '',
      workflow: { ...(item.workflow || {}), reviewedBy: currentUser?.email || '', approvedBy: currentUser?.email || '' }
    }), 'Event published.')
  }

  const handleScheduleEvent = (event) => {
    if (!canPublish) { setNotice({ tone: 'error', text: 'Your role cannot schedule events.' }); return }
    openModal({
      title: 'Schedule Event',
      message: 'Enter the date and time for this event to be automatically published.',
      showInput: true,
      initialValue: new Date().toISOString().slice(0, 16),
      inputPlaceholder: 'YYYY-MM-DDTHH:MM',
      onConfirm: (input) => {
        if (!input) return
        const scheduleDate = new Date(input)
        if (Number.isNaN(scheduleDate.getTime())) {
          setNotice({ tone: 'error', text: 'Invalid schedule format.' })
          return
        }
        void updateSingleEventWorkflow(event.id, (item) => ({
          ...item, status: 'scheduled', scheduledPublishAt: scheduleDate.toISOString(),
          workflow: { ...(item.workflow || {}), approvedBy: currentUser?.email || '' }
        }), 'Event scheduled.')
      }
    })
  }

  const handleRollbackEvent = (event) => {
    if (!canWrite) { setNotice({ tone: 'error', text: 'Your role cannot rollback events.' }); return }
    const latest = Array.isArray(event.versions) ? event.versions[0] : null
    if (!latest?.snapshot) {
      setNotice({ tone: 'error', text: 'No event version available for rollback.' })
      return
    }
    openModal({
      title: 'Rollback Event',
      message: `Rollback "${event.title}" to the previous version? The current changes will be archived.`,
      tone: 'warning',
      confirmLabel: 'Rollback',
      onConfirm: async () => {
        const rolledBackEvent = {
          ...latest.snapshot,
          versions: (event.versions || []).slice(1),
          updatedAt: new Date().toISOString()
        }
        try {
          await updateBotEvent(event.id, toBotEventPayload(rolledBackEvent))
          await refreshEvents({ silent: true, suppressErrorNotice: true })
          setNotice({ tone: 'success', text: 'Event rolled back.' })
          audit('event.rollback', { id: event.id })
        } catch (error) {
          setNotice({ tone: 'error', text: error?.message || 'Unable to rollback this event right now.' })
        }
      }
    })
  }

  // 60-second scheduled publish interval
  useEffect(() => {
    const interval = window.setInterval(() => {
      const scheduled = applyScheduledEventTransitions(events)
      if (!scheduled.changed) return

      const originalById = new Map(events.map((event) => [String(event.id), event]))
      const dueEvents = scheduled.events.filter((event) => {
        const original = originalById.get(String(event.id))
        return original && original.status !== event.status
      })
      if (dueEvents.length === 0) return

      Promise.all(dueEvents.map((event) => updateBotEvent(event.id, toBotEventPayload(event))))
        .then(() => refreshEvents({ silent: true, suppressErrorNotice: true }))
        .then(() => setNotice({ tone: 'success', text: 'A scheduled event has been auto-published.' }))
        .catch(() => {})
    }, 60_000)

    return () => window.clearInterval(interval)
  }, [events])

  return {
    updateSingleEventWorkflow,
    handleSubmitForReview,
    handleApproveEvent,
    handlePublishEvent,
    handleScheduleEvent,
    handleRollbackEvent
  }
}
