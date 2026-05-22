import { pushEventVersion } from './eventManagerUtils'
import { updateBotEvent, deleteBotEvent, toBotEventPayload } from '../../../utils/eventsApi'
import { recordAdminAudit } from '../../../utils/adminApi'

const audit = (action, details = {}) => {
  recordAdminAudit({ action, resource: 'content.event', details }).catch(() => {})
}

export function useEventBulk({
  events,
  setNotice,
  canWrite,
  canPublish,
  refreshEvents,
  openModal
}) {
  const executeBulkAction = async (action, selection) => {
    const now = new Date().toISOString()
    const targetedEvents = events
      .filter((event) => selection.has(String(event.id)))
      .map((event) => {
        if (action === 'delete') return event
        const withVersion = pushEventVersion(event, `bulk_${action}`)
        if (action === 'publish' && canPublish) {
          return { ...withVersion, status: 'published', publishedAt: now, scheduledPublishAt: '', updatedAt: now }
        }
        if (action === 'review') {
          return { ...withVersion, status: 'pending_review', workflow: { ...(withVersion.workflow || {}), submittedAt: now }, updatedAt: now }
        }
        return { ...withVersion, status: 'draft', updatedAt: now }
      })

    try {
      if (action === 'delete') {
        await Promise.all(targetedEvents.map((event) => deleteBotEvent(event.id)))
      } else {
        await Promise.all(targetedEvents.map((event) => updateBotEvent(event.id, toBotEventPayload(event))))
      }
      await refreshEvents({ silent: true, suppressErrorNotice: true })
      setNotice({ tone: 'success', text: `Bulk action "${action}" for ${selection.size} event(s) completed.` })
      audit('event.bulk_action', { action, count: selection.size })
    } catch (error) {
      setNotice({ tone: 'error', text: error?.message || 'Unable to complete that bulk action right now.' })
    }
  }

  const handleBulkDelete = (selectedEvents, setSelectedEvents) => {
    if (!selectedEvents.length) return
    if (!canWrite) { setNotice({ tone: 'error', text: 'Your role cannot run that bulk event action.' }); return }
    const selection = new Set(selectedEvents.map(String))
    openModal({
      title: 'Bulk Delete',
      message: `Delete ${selectedEvents.length} selected event(s)? This action cannot be undone.`,
      tone: 'danger',
      confirmLabel: 'Delete All',
      onConfirm: async () => {
        await executeBulkAction('delete', selection)
        setSelectedEvents([])
      }
    })
  }

  const handleBulkStatusChange = async (action, selectedEvents, setSelectedEvents) => {
    if (!selectedEvents.length) return
    const hasBulkPermission = action === 'publish' ? canPublish : canWrite
    if (!hasBulkPermission) { setNotice({ tone: 'error', text: 'Your role cannot run that bulk event action.' }); return }
    const selection = new Set(selectedEvents.map(String))
    await executeBulkAction(action, selection)
    setSelectedEvents([])
  }

  return {
    executeBulkAction,
    handleBulkDelete,
    handleBulkStatusChange
  }
}
