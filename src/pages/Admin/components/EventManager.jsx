import { useState, useEffect, useRef } from 'react'
import { Plus, Calendar, Clock, MapPin, Users, Search, Edit2, Trash2 } from 'lucide-react'
import {
  createDefaultRegistrationMethods,
  normalizeRegistrationMethods,
  fetchBotEvents,
  createBotEvent,
  updateBotEvent,
  deleteBotEvent,
  mapBotEventToAdminEvent,
  toBotEventPayload
} from '../../../utils/eventsApi'
import { syncEventEmailAudience } from '../../../utils/newsletterApi'
import { recordAdminAudit } from '../../../utils/adminApi'
import { useAdminTheme } from '../AdminThemeContext'

const EVENT_CATEGORIES_STORAGE_KEY = 'admin_event_categories'
const DEFAULT_EVENT_CATEGORIES = ['general', 'youth', 'worship', 'outreach', 'conference']

const normalizeCategory = (value) => {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, '-')
}

const formatCategoryLabel = (value) => {
  return String(value || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

const mergeCategories = (...categoryLists) => {
  const merged = categoryLists
    .flat()
    .map((item) => normalizeCategory(item))
    .filter(Boolean)

  return Array.from(new Set(merged))
}

const EVENT_WORKFLOW_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'scheduled', label: 'Scheduled' },
  { value: 'published', label: 'Published' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'completed', label: 'Completed' }
]

const pushEventVersion = (event, reason = 'revision') => {
  const snapshot = {
    ...event,
    versions: undefined
  }
  const version = {
    id: `v-${Date.now()}`,
    createdAt: new Date().toISOString(),
    reason,
    snapshot
  }
  return {
    ...event,
    versions: [version, ...(Array.isArray(event.versions) ? event.versions : [])].slice(0, 20)
  }
}

const applyScheduledEventTransitions = (events = []) => {
  const now = Date.now()
  let changed = false

  const next = events.map((event) => {
    if (event.status === 'scheduled' && event.scheduledPublishAt) {
      const time = new Date(event.scheduledPublishAt).getTime()
      if (Number.isFinite(time) && time <= now) {
        changed = true
        return {
          ...event,
          status: 'published',
          publishedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      }
    }
    return event
  })

  return { events: next, changed }
}

const EventManager = ({ currentUser = null, hasPermission = () => false }) => {
  const { darkMode } = useAdminTheme()
  const ui = {
    panel: darkMode ? '#1a2235' : 'white',
    panelAlt: darkMode ? '#131b2e' : '#fafafa',
    panelSubtle: darkMode ? '#222c40' : '#f3f4f6',
    border: darkMode ? '#2a3550' : '#e5e7eb',
    borderSoft: darkMode ? '#3a4866' : '#d1d5db',
    textPrimary: darkMode ? '#e2e8f0' : '#111827',
    textSecondary: darkMode ? '#94afd4' : '#6b7280',
    textMuted: darkMode ? '#c3d4ef' : '#374151',
    textFaint: darkMode ? '#7f93b3' : '#9ca3af'
  }
  const [view, setView] = useState('list') // list, create, edit
  const [events, setEvents] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [selectedEvents, setSelectedEvents] = useState([])
  const [notice, setNotice] = useState(null)
  const [tagInput, setTagInput] = useState('')
  const [isImageUploading, setIsImageUploading] = useState(false)
  const [categories, setCategories] = useState(DEFAULT_EVENT_CATEGORIES)
  const [newCategoryInput, setNewCategoryInput] = useState('')
  const imageFileInputRef = useRef(null)
  const [formData, setFormData] = useState({
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
    workflow: {
      submittedAt: '',
      reviewedBy: '',
      approvedBy: '',
      rejectedReason: ''
    },
    versions: [],
    whatToExpect: [],
    imageUrl: '',
    createdAt: null,
    updatedAt: null
  })
  const canWrite = hasPermission('content:event:write') || hasPermission('content:event:publish')
  const canApprove = hasPermission('content:event:approve') || hasPermission('content:event:publish')
  const audit = (action, details = {}) => {
    recordAdminAudit({ action, resource: 'content.event', details }).catch(() => {})
  }

  useEffect(() => {
    let isMounted = true

    const parseCachedEvents = () => {
      const raw = localStorage.getItem('admin_events')
      if (!raw) {
        return []
      }

      try {
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed)
          ? parsed.map((event) => ({
            ...event,
            category: normalizeCategory(event?.category) || 'general',
            registrationLink: String(event?.registrationLink || '/contact').trim() || '/contact',
            registrationMethods: normalizeRegistrationMethods(event?.registrationMethods),
            whatToExpect: Array.isArray(event?.whatToExpect) ? event.whatToExpect : []
          }))
          : []
      } catch {
        return []
      }
    }

    const loadEvents = async () => {
      let storedCategories = []
      const rawCategories = localStorage.getItem(EVENT_CATEGORIES_STORAGE_KEY)
      if (rawCategories) {
        try {
          const parsedCategories = JSON.parse(rawCategories)
          if (Array.isArray(parsedCategories)) {
            storedCategories = parsedCategories
          }
        } catch {
          storedCategories = []
        }
      }

      try {
        const botEvents = await fetchBotEvents()
        const normalized = botEvents.map(mapBotEventToAdminEvent)
        if (!isMounted) {
          return
        }

        const scheduled = applyScheduledEventTransitions(normalized)
        setEvents(scheduled.events)
        localStorage.setItem('admin_events', JSON.stringify(scheduled.events))

        const combinedCategories = mergeCategories(
          DEFAULT_EVENT_CATEGORIES,
          storedCategories,
          normalized.map((event) => event.category)
        )
        setCategories(combinedCategories)
        localStorage.setItem(EVENT_CATEGORIES_STORAGE_KEY, JSON.stringify(combinedCategories))
        return
      } catch {
        const cachedEvents = parseCachedEvents()
        if (!isMounted) {
          return
        }

        const scheduled = applyScheduledEventTransitions(cachedEvents)
        setEvents(scheduled.events)
        localStorage.setItem('admin_events', JSON.stringify(scheduled.events))
        const combinedCategories = mergeCategories(
          DEFAULT_EVENT_CATEGORIES,
          storedCategories,
          cachedEvents.map((event) => event.category)
        )
        setCategories(combinedCategories)
        localStorage.setItem(EVENT_CATEGORIES_STORAGE_KEY, JSON.stringify(combinedCategories))
      }
    }

    loadEvents()

    return () => {
      isMounted = false
    }
  }, [])

  const saveEvents = (updatedEvents, categoryBase = categories) => {
    const scheduled = applyScheduledEventTransitions(updatedEvents)
    setEvents(scheduled.events)
    localStorage.setItem('admin_events', JSON.stringify(scheduled.events))

    const combinedCategories = mergeCategories(categoryBase, scheduled.events.map((event) => event.category))
    setCategories(combinedCategories)
    localStorage.setItem(EVENT_CATEGORIES_STORAGE_KEY, JSON.stringify(combinedCategories))

    window.dispatchEvent(new CustomEvent('adminEventsUpdated'))
  }

  useEffect(() => {
    const interval = window.setInterval(() => {
      setEvents((prev) => {
        const result = applyScheduledEventTransitions(prev)
        if (result.changed) {
          localStorage.setItem('admin_events', JSON.stringify(result.events))
          setNotice({ tone: 'success', text: 'A scheduled event has been auto-published.' })
        }
        return result.events
      })
    }, 60_000)

    return () => window.clearInterval(interval)
  }, [])

  useEffect(() => {
    const ids = new Set(events.map((event) => String(event.id)))
    setSelectedEvents((prev) => prev.filter((id) => ids.has(String(id))))
  }, [events])

  const handleSubmit = async (e) => {
    e.preventDefault()
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
    const normalizedTags = Array.from(new Set((formData.whatToExpect || [])
      .map((tag) => String(tag || '').trim())
      .filter(Boolean)))

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
      publishedAt:
        formData.status === 'published'
          ? (formData.publishedAt || nowIso)
          : formData.publishedAt || '',
      workflow: {
        ...(formData.workflow || {}),
        submittedAt:
          formData.status === 'pending_review'
            ? (formData.workflow?.submittedAt || nowIso)
            : formData.workflow?.submittedAt || '',
        reviewedBy:
          (formData.status === 'approved' || formData.status === 'published')
            ? (currentUser?.email || formData.workflow?.reviewedBy || '')
            : formData.workflow?.reviewedBy || '',
        approvedBy:
          (formData.status === 'approved' || formData.status === 'published')
            ? (currentUser?.email || formData.workflow?.approvedBy || '')
            : formData.workflow?.approvedBy || ''
      },
      updatedAt: nowIso
    }

    const payload = toBotEventPayload(normalized)

    const syncEmailAudience = async (eventRecord) => {
      try {
        const syncResult = await syncEventEmailAudience(eventRecord)
        return syncResult?.message || `Event communication audience synced for ${syncResult?.recipientCount || 0} recipients.`
      } catch {
        return 'Event saved, but email audience sync is currently unavailable.'
      }
    }

    try {
      if (view === 'create') {
        const created = await createBotEvent(payload)
        const mapped = mapBotEventToAdminEvent(created)
        saveEvents([...events, mapped])
        const syncMessage = await syncEmailAudience(mapped)
        setNotice({ tone: 'success', text: `Event created and synced to bot API. ${syncMessage}` })
        audit('event.create', { id: mapped.id, status: mapped.status })
      } else if (view === 'edit') {
        const updatedRemote = await updateBotEvent(formData.id, payload)
        const mapped = mapBotEventToAdminEvent(updatedRemote)
        const updatedEvents = events.map((evt) => (String(evt.id) === String(formData.id) ? mapped : evt))
        saveEvents(updatedEvents)
        const syncMessage = await syncEmailAudience(mapped)
        setNotice({ tone: 'success', text: `Event updated and synced to bot API. ${syncMessage}` })
        audit('event.update', { id: mapped.id, status: mapped.status })
      }
      resetForm()
      return
    } catch {
      // Fallback: keep admin productive even when bot API is unavailable.
    }

    if (view === 'create') {
      const newEvent = {
        ...normalized,
        id: `local-${Date.now()}`,
        createdAt: nowIso,
        updatedAt: null,
        versions: []
      }
      saveEvents([...events, newEvent])
      const syncMessage = await syncEmailAudience(newEvent)
      setNotice({ tone: 'error', text: `Bot API unreachable. Event saved locally only. ${syncMessage}` })
      audit('event.create_local', { id: newEvent.id, status: newEvent.status })
    } else if (view === 'edit') {
      const updated = events.map((evt) => String(evt.id) === String(formData.id)
        ? {
          ...pushEventVersion(evt, 'manual_update'),
          ...normalized,
          id: evt.id,
          createdAt: evt.createdAt || nowIso
        }
        : evt)
      saveEvents(updated)
      const current = updated.find((evt) => String(evt.id) === String(formData.id))
      const syncMessage = await syncEmailAudience(current || normalized)
      setNotice({ tone: 'error', text: `Bot API unreachable. Changes saved locally only. ${syncMessage}` })
      audit('event.update_local', { id: formData.id, status: normalized.status })
    }

    resetForm()
  }

  const resetForm = () => {
    setFormData({
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
      workflow: {
        submittedAt: '',
        reviewedBy: '',
        approvedBy: '',
        rejectedReason: ''
      },
      versions: [],
      whatToExpect: [],
      imageUrl: '',
      createdAt: null,
      updatedAt: null
    })
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
    localStorage.setItem(EVENT_CATEGORIES_STORAGE_KEY, JSON.stringify(merged))
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
    if (!window.confirm(message)) {
      return
    }

    try {
      await deleteBotEvent(id)
      saveEvents(events.filter((evt) => String(evt.id) !== String(id)))
      setNotice({ tone: 'success', text: 'Event deleted successfully.' })
      audit('event.delete', { id })
      return
    } catch {
      // Fall through to local-only delete for offline-mode entries.
    }

    saveEvents(events.filter((evt) => String(evt.id) !== String(id)))
    setNotice({ tone: 'error', text: 'Bot API unreachable. Event removed locally only.' })
    audit('event.delete_local', { id })
  }

  const updateSingleEventWorkflow = (eventId, updater, successMessage) => {
    const now = new Date().toISOString()
    const updatedEvents = events.map((item) => {
      if (String(item.id) !== String(eventId)) return item
      const withVersion = pushEventVersion(item, 'workflow_change')
      return updater({ ...withVersion, updatedAt: now }, now)
    })
    saveEvents(updatedEvents)
    const updatedEvent = updatedEvents.find((item) => String(item.id) === String(eventId))
    if (updatedEvent && !String(updatedEvent.id).startsWith('local-')) {
      updateBotEvent(updatedEvent.id, toBotEventPayload(updatedEvent)).catch(() => {})
    }
    setNotice({ tone: 'success', text: successMessage })
    audit('event.workflow', { id: eventId, action: successMessage })
  }

  const handleSubmitForReview = (event) => {
    if (!canWrite) {
      setNotice({ tone: 'error', text: 'Your role cannot submit events for review.' })
      return
    }
    updateSingleEventWorkflow(
      event.id,
      (item, now) => ({
        ...item,
        status: 'pending_review',
        workflow: {
          ...(item.workflow || {}),
          submittedAt: now
        }
      }),
      'Event submitted for review.'
    )
  }

  const handleApproveEvent = (event) => {
    if (!canApprove) {
      setNotice({ tone: 'error', text: 'Your role cannot approve events.' })
      return
    }
    updateSingleEventWorkflow(
      event.id,
      (item) => ({
        ...item,
        status: 'approved',
        workflow: {
          ...(item.workflow || {}),
          reviewedBy: currentUser?.email || '',
          approvedBy: currentUser?.email || ''
        }
      }),
      'Event approved.'
    )
  }

  const handlePublishEvent = (event) => {
    if (!canApprove) {
      setNotice({ tone: 'error', text: 'Your role cannot publish events.' })
      return
    }
    updateSingleEventWorkflow(
      event.id,
      (item, now) => ({
        ...item,
        status: 'published',
        publishedAt: now,
        scheduledPublishAt: '',
        workflow: {
          ...(item.workflow || {}),
          reviewedBy: currentUser?.email || '',
          approvedBy: currentUser?.email || ''
        }
      }),
      'Event published.'
    )
  }

  const handleScheduleEvent = (event) => {
    if (!canApprove) {
      setNotice({ tone: 'error', text: 'Your role cannot schedule events.' })
      return
    }
    const input = window.prompt('Schedule publish date/time (ISO e.g. 2026-03-28T10:00)')
    if (!input) return
    const scheduleDate = new Date(input)
    if (Number.isNaN(scheduleDate.getTime())) {
      setNotice({ tone: 'error', text: 'Invalid schedule format.' })
      return
    }

    updateSingleEventWorkflow(
      event.id,
      (item) => ({
        ...item,
        status: 'scheduled',
        scheduledPublishAt: scheduleDate.toISOString(),
        workflow: {
          ...(item.workflow || {}),
          approvedBy: currentUser?.email || ''
        }
      }),
      'Event scheduled.'
    )
  }

  const handleRollbackEvent = (event) => {
    if (!canWrite) {
      setNotice({ tone: 'error', text: 'Your role cannot rollback events.' })
      return
    }
    const latest = Array.isArray(event.versions) ? event.versions[0] : null
    if (!latest?.snapshot) {
      setNotice({ tone: 'error', text: 'No event version available for rollback.' })
      return
    }

    const confirmed = window.confirm(`Rollback "${event.title}" to previous version?`)
    if (!confirmed) return

    const updatedEvents = events.map((item) => {
      if (String(item.id) !== String(event.id)) return item
      return {
        ...latest.snapshot,
        versions: (event.versions || []).slice(1),
        updatedAt: new Date().toISOString()
      }
    })
    saveEvents(updatedEvents)
    setNotice({ tone: 'success', text: 'Event rolled back.' })
    audit('event.rollback', { id: event.id })
  }

  const handleSelectEvent = (id) => {
    setSelectedEvents((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ))
  }

  const handleSelectAllEvents = (checked) => {
    if (!checked) {
      setSelectedEvents([])
      return
    }
    setSelectedEvents(filteredEvents.map((event) => String(event.id)))
  }

  const handleBulkEventAction = async (action) => {
    if (!selectedEvents.length) return
    if (!canWrite) {
      setNotice({ tone: 'error', text: 'Your role cannot run bulk event actions.' })
      return
    }

    const selection = new Set(selectedEvents.map(String))
    if (action === 'delete') {
      if (!window.confirm(`Delete ${selectedEvents.length} selected event(s)?`)) return
    }

    const updatedEvents = events
      .map((event) => {
        if (!selection.has(String(event.id))) return event
        if (action === 'delete') return null

        const withVersion = pushEventVersion(event, `bulk_${action}`)
        const now = new Date().toISOString()

        if (action === 'publish' && canApprove) {
          return { ...withVersion, status: 'published', publishedAt: now, scheduledPublishAt: '', updatedAt: now }
        }
        if (action === 'review') {
          return {
            ...withVersion,
            status: 'pending_review',
            workflow: { ...(withVersion.workflow || {}), submittedAt: now },
            updatedAt: now
          }
        }
        return { ...withVersion, status: 'draft', updatedAt: now }
      })
      .filter(Boolean)

    saveEvents(updatedEvents)
    if (action === 'delete') {
      events.forEach((event) => {
        if (!event || !selection.has(String(event.id)) || String(event.id).startsWith('local-')) return
        deleteBotEvent(event.id).catch(() => {})
      })
    } else {
      updatedEvents.forEach((event) => {
        if (!event || String(event.id).startsWith('local-')) return
        if (!selection.has(String(event.id))) return
        updateBotEvent(event.id, toBotEventPayload(event)).catch(() => {})
      })
    }
    setSelectedEvents([])
    setNotice({ tone: 'success', text: `Bulk action "${action}" applied.` })
    audit('event.bulk_action', { action, count: selectedEvents.length })
  }


  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleAddTag = (rawValue) => {
    const nextTag = String(rawValue || '').trim()
    if (!nextTag) {
      return
    }

    const exists = (formData.whatToExpect || []).some((tag) => tag.toLowerCase() === nextTag.toLowerCase())
    if (exists) {
      setTagInput('')
      return
    }

    setFormData((prev) => ({
      ...prev,
      whatToExpect: [...(prev.whatToExpect || []), nextTag]
    }))
    setTagInput('')
  }

  const handleRemoveTag = (tagToRemove) => {
    setFormData((prev) => ({
      ...prev,
      whatToExpect: (prev.whatToExpect || []).filter((tag) => tag !== tagToRemove)
    }))
  }

  const handleTagKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      handleAddTag(tagInput)
    }
  }

  const handleAddCategory = () => {
    const nextCategory = normalizeCategory(newCategoryInput)
    if (!nextCategory) {
      setNotice({ tone: 'error', text: 'Enter a valid category name.' })
      return
    }

    const alreadyExists = categories.includes(nextCategory)
    const updatedCategories = alreadyExists ? categories : mergeCategories(categories, [nextCategory])

    if (!alreadyExists) {
      setCategories(updatedCategories)
      localStorage.setItem(EVENT_CATEGORIES_STORAGE_KEY, JSON.stringify(updatedCategories))
    }

    setFormData((prev) => ({ ...prev, category: nextCategory }))
    setNewCategoryInput('')
    setNotice({
      tone: 'success',
      text: alreadyExists
        ? `${formatCategoryLabel(nextCategory)} selected.`
        : `${formatCategoryLabel(nextCategory)} category added.`
    })
  }

  const handleRegistrationMethodChange = (method, field, value) => {
    setFormData((prev) => ({
      ...prev,
      registrationMethods: {
        ...normalizeRegistrationMethods(prev.registrationMethods),
        [method]: {
          ...normalizeRegistrationMethods(prev.registrationMethods)[method],
          [field]: value
        }
      }
    }))
  }

  const handlePickImage = () => {
    imageFileInputRef.current?.click()
  }

  const handleImageUploadChange = (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''

    if (!file) {
      return
    }

    if (!file.type.startsWith('image/')) {
      setNotice({ tone: 'error', text: 'Please select a valid image file.' })
      return
    }

    if (file.size > 3 * 1024 * 1024) {
      setNotice({ tone: 'error', text: 'Image is too large. Please use an image below 3MB.' })
      return
    }

    setIsImageUploading(true)

    const reader = new FileReader()
    reader.onload = () => {
      const value = typeof reader.result === 'string' ? reader.result : ''
      if (!value) {
        setNotice({ tone: 'error', text: 'Unable to read image. Please try again.' })
        setIsImageUploading(false)
        return
      }

      setFormData((prev) => ({
        ...prev,
        imageUrl: value
      }))
      setNotice({ tone: 'success', text: 'Event image uploaded successfully.' })
      setIsImageUploading(false)
    }

    reader.onerror = () => {
      setNotice({ tone: 'error', text: 'Unable to upload image right now. Please try again.' })
      setIsImageUploading(false)
    }

    reader.readAsDataURL(file)
  }

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || normalizeCategory(event.category) === filterCategory
    const matchesStatus = filterStatus === 'all' || String(event.status || '').toLowerCase() === filterStatus
    return matchesSearch && matchesCategory && matchesStatus
  })

  const formatStamp = (value) => {
    if (!value) {
      return 'Not updated yet'
    }

    const date = new Date(value)
    if (Number.isNaN(date.getTime())) {
      return 'Unknown'
    }

    return date.toLocaleString()
  }

  const getCategoryColor = (category) => {
    const colors = {
      general: ui.textSecondary,
      youth: '#5a4494',
      worship: '#d4a82e',
      outreach: '#10b981',
      conference: '#2d3a7a'
    }
    return colors[category] || colors.general
  }

  if (view === 'create' || view === 'edit') {
    return (
      <div>
        <div style={{ marginBottom: '2rem' }}>
          <button
            onClick={resetForm}
            style={{
              padding: '0.5rem 1rem',
              background: ui.panel,
              color: ui.textMuted,
              border: `1px solid ${ui.borderSoft}`,
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer',
              marginBottom: '1rem'
            }}
          >
            ← Back to Events
          </button>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', color: ui.textPrimary }}>
            {view === 'create' ? 'Create New Event' : 'Edit Event'}
          </h1>
        </div>

        <div style={{ 
          background: ui.panel, 
          padding: '2rem', 
          borderRadius: '0.75rem',
          border: `1px solid ${ui.border}`
        }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: ui.textMuted }}>
                  Event Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  required
                  style={{
                    padding: '0.75rem',
                    border: `1px solid ${ui.borderSoft}`,
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                  placeholder="e.g., Youth Sunday Service"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: ui.textMuted }}>
                  Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  style={{
                    padding: '0.75rem',
                    border: `1px solid ${ui.borderSoft}`,
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                >
                  {categories.map((category) => (
                    <option key={category} value={category}>
                      {formatCategoryLabel(category)}
                    </option>
                  ))}
                </select>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input
                    type="text"
                    value={newCategoryInput}
                    onChange={(e) => setNewCategoryInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddCategory()
                      }
                    }}
                    style={{
                      flex: 1,
                      padding: '0.65rem 0.75rem',
                      border: `1px solid ${ui.borderSoft}`,
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                    placeholder="Add a new category"
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    style={{
                      padding: '0.65rem 0.9rem',
                      border: `1px solid ${ui.borderSoft}`,
                      borderRadius: '0.5rem',
                      background: ui.panel,
                      color: ui.textMuted,
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: ui.textMuted }}>
                Description *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                required
                rows={4}
                style={{
                  padding: '0.75rem',
                  border: `1px solid ${ui.borderSoft}`,
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  resize: 'vertical'
                }}
                placeholder="Event description, schedule, and details..."
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: ui.textMuted }}>
                  Date *
                </label>
                <input
                  type="date"
                  name="date"
                  value={formData.date}
                  onChange={handleChange}
                  required
                  style={{
                    padding: '0.75rem',
                    border: `1px solid ${ui.borderSoft}`,
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: ui.textMuted }}>
                  Time *
                </label>
                <input
                  type="time"
                  name="time"
                  value={formData.time}
                  onChange={handleChange}
                  required
                  style={{
                    padding: '0.75rem',
                    border: `1px solid ${ui.borderSoft}`,
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: ui.textMuted }}>
                  Capacity
                </label>
                <input
                  type="number"
                  name="capacity"
                  value={formData.capacity}
                  onChange={handleChange}
                  style={{
                    padding: '0.75rem',
                    border: `1px solid ${ui.borderSoft}`,
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                  placeholder="Max attendees"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: ui.textMuted }}>
                  Location *
                </label>
                <input
                  type="text"
                  name="location"
                  value={formData.location}
                  onChange={handleChange}
                  required
                  style={{
                    padding: '0.75rem',
                    border: `1px solid ${ui.borderSoft}`,
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                  placeholder="e.g., Main Auditorium"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: ui.textMuted }}>
                  Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  style={{
                    padding: '0.75rem',
                    border: `1px solid ${ui.borderSoft}`,
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                >
                  {EVENT_WORKFLOW_STATUSES.map((status) => (
                    <option key={status.value} value={status.value}>
                      {status.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {formData.status === 'scheduled' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.875rem', fontWeight: 600, color: ui.textMuted }}>
                  Scheduled Publish Time
                </label>
                <input
                  type="datetime-local"
                  name="scheduledPublishAt"
                  value={formData.scheduledPublishAt ? String(formData.scheduledPublishAt).slice(0, 16) : ''}
                  onChange={handleChange}
                  style={{
                    padding: '0.75rem',
                    border: `1px solid ${ui.borderSoft}`,
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: ui.textMuted }}>
                Event Image URL (Optional)
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  ref={imageFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUploadChange}
                  style={{ display: 'none' }}
                />
                <input
                  type="url"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleChange}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: `1px solid ${ui.borderSoft}`,
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                  placeholder="https://example.com/event-image.jpg"
                />
                <button
                  type="button"
                  onClick={handlePickImage}
                  disabled={isImageUploading}
                  style={{
                    padding: '0.75rem 1rem',
                    border: `1px solid ${ui.borderSoft}`,
                    borderRadius: '0.5rem',
                    background: ui.panel,
                    color: ui.textMuted,
                    fontWeight: 600,
                    cursor: isImageUploading ? 'not-allowed' : 'pointer',
                    opacity: isImageUploading ? 0.7 : 1
                  }}
                >
                  {isImageUploading ? 'Uploading...' : 'Upload Image'}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
              <label style={{ fontSize: '0.875rem', fontWeight: 600, color: ui.textMuted }}>
                What To Expect Tags
              </label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  style={{
                    flex: 1,
                    padding: '0.75rem',
                    border: `1px solid ${ui.borderSoft}`,
                    borderRadius: '0.5rem',
                    fontSize: '1rem'
                  }}
                  placeholder="Type a tag and press Enter (e.g., Games)"
                />
                <button
                  type="button"
                  onClick={() => handleAddTag(tagInput)}
                  style={{
                    padding: '0.75rem 1rem',
                    border: `1px solid ${ui.borderSoft}`,
                    borderRadius: '0.5rem',
                    background: ui.panel,
                    color: ui.textMuted,
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Add
                </button>
              </div>
              <p style={{ margin: 0, color: ui.textSecondary, fontSize: '0.75rem' }}>
                Press Enter after each tag. Tags are saved per event.
              </p>
              {(formData.whatToExpect || []).length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {formData.whatToExpect.map((tag) => (
                    <span
                      key={tag}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        padding: '0.3rem 0.65rem',
                        borderRadius: '9999px',
                        background: ui.panelSubtle,
                        color: ui.textMuted,
                        fontSize: '0.75rem',
                        fontWeight: 600
                      }}
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(tag)}
                        style={{
                          border: 'none',
                          background: 'transparent',
                          color: ui.textSecondary,
                          cursor: 'pointer',
                          padding: 0,
                          lineHeight: 1
                        }}
                        aria-label={`Remove ${tag}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <input
                type="checkbox"
                id="registrationRequired"
                name="registrationRequired"
                checked={formData.registrationRequired}
                onChange={handleChange}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
              <label htmlFor="registrationRequired" style={{ fontSize: '0.875rem', fontWeight: 500, color: ui.textMuted, cursor: 'pointer' }}>
                Require registration for this event
              </label>
            </div>

            {formData.registrationRequired && (
              <div
                style={{
                  border: `1px solid ${ui.border}`,
                  borderRadius: '0.75rem',
                  padding: '1rem',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '1rem',
                  background: ui.panelAlt
                }}
              >
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', color: ui.textPrimary }}>Registration Setup</h3>
                  <p style={{ margin: '0.35rem 0 0', fontSize: '0.8rem', color: ui.textSecondary }}>
                    Configure how people can register for this event.
                  </p>
                </div>

                <label style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: ui.textMuted }}>Fallback Registration Link</span>
                  <input
                    type="url"
                    name="registrationLink"
                    value={formData.registrationLink || '/contact'}
                    onChange={handleChange}
                    placeholder="/contact or https://..."
                    style={{
                      padding: '0.7rem',
                      border: `1px solid ${ui.borderSoft}`,
                      borderRadius: '0.5rem',
                      fontSize: '0.9rem'
                    }}
                  />
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div style={{ border: `1px solid ${ui.border}`, borderRadius: '0.6rem', padding: '0.85rem', background: ui.panel }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(formData.registrationMethods?.whatsapp?.enabled)}
                        onChange={(e) => handleRegistrationMethodChange('whatsapp', 'enabled', e.target.checked)}
                      />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: ui.textMuted }}>WhatsApp Registration</span>
                    </label>

                    {formData.registrationMethods?.whatsapp?.enabled && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                        <input
                          type="text"
                          value={formData.registrationMethods?.whatsapp?.label || ''}
                          onChange={(e) => handleRegistrationMethodChange('whatsapp', 'label', e.target.value)}
                          placeholder="Button label"
                          style={{
                            padding: '0.65rem',
                            border: `1px solid ${ui.borderSoft}`,
                            borderRadius: '0.45rem',
                            fontSize: '0.85rem'
                          }}
                        />
                        <input
                          type="tel"
                          value={formData.registrationMethods?.whatsapp?.phone || ''}
                          onChange={(e) => handleRegistrationMethodChange('whatsapp', 'phone', e.target.value)}
                          placeholder="WhatsApp number e.g. +2347031526399"
                          style={{
                            padding: '0.65rem',
                            border: `1px solid ${ui.borderSoft}`,
                            borderRadius: '0.45rem',
                            fontSize: '0.85rem'
                          }}
                        />
                      </div>
                    )}
                  </div>

                  <div style={{ border: `1px solid ${ui.border}`, borderRadius: '0.6rem', padding: '0.85rem', background: ui.panel }}>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                      <input
                        type="checkbox"
                        checked={Boolean(formData.registrationMethods?.payment?.enabled)}
                        onChange={(e) => handleRegistrationMethodChange('payment', 'enabled', e.target.checked)}
                      />
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, color: ui.textMuted }}>Payment Registration</span>
                    </label>

                    {formData.registrationMethods?.payment?.enabled && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
                        <input
                          type="text"
                          value={formData.registrationMethods?.payment?.label || ''}
                          onChange={(e) => handleRegistrationMethodChange('payment', 'label', e.target.value)}
                          placeholder="Button label"
                          style={{
                            padding: '0.65rem',
                            border: `1px solid ${ui.borderSoft}`,
                            borderRadius: '0.45rem',
                            fontSize: '0.85rem'
                          }}
                        />
                        <input
                          type="url"
                          value={formData.registrationMethods?.payment?.url || ''}
                          onChange={(e) => handleRegistrationMethodChange('payment', 'url', e.target.value)}
                          placeholder="https://payment-link.example"
                          style={{
                            padding: '0.65rem',
                            border: `1px solid ${ui.borderSoft}`,
                            borderRadius: '0.45rem',
                            fontSize: '0.85rem'
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', paddingTop: '1rem', borderTop: `1px solid ${ui.border}` }}>
              <button
                type="submit"
                style={{
                  padding: '0.75rem 2rem',
                  background: '#5a4494',
                  color: 'white',
                  border: 'none',
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                {view === 'create' ? 'Create Event' : 'Update Event'}
              </button>
              <button
                type="button"
                onClick={resetForm}
                style={{
                  padding: '0.75rem 2rem',
                  background: ui.panel,
                  color: ui.textMuted,
                  border: `1px solid ${ui.borderSoft}`,
                  borderRadius: '0.5rem',
                  fontSize: '1rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div>
      {notice && (
        <div
          style={{
            marginBottom: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            border: `1px solid ${notice.tone === 'error' ? '#fecaca' : '#86efac'}`,
            background: notice.tone === 'error' ? '#fef2f2' : '#ecfdf3',
            color: notice.tone === 'error' ? '#991b1b' : '#166534'
          }}
        >
          {notice.text}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', color: ui.textPrimary }}>
            Event Management
          </h1>
          <p style={{ margin: 0, color: ui.textSecondary }}>
            {events.length} total events
          </p>
        </div>
        <button
          onClick={() => setView('create')}
          disabled={!canWrite}
          style={{
            padding: '0.75rem 1.5rem',
            background: '#5a4494',
            color: 'white',
            border: 'none',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            fontWeight: 600,
            cursor: canWrite ? 'pointer' : 'not-allowed',
            opacity: canWrite ? 1 : 0.6,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}
        >
          <Plus size={18} />
          New Event
        </button>
      </div>

      {/* Search and Filters */}
      <div style={{ 
        background: ui.panel, 
        padding: '1.5rem', 
        borderRadius: '0.75rem',
        border: `1px solid ${ui.border}`,
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, position: 'relative' }}>
            <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: ui.textFaint }} />
            <input
              type="text"
              placeholder="Search events..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                border: `1px solid ${ui.borderSoft}`,
                borderRadius: '0.5rem',
                fontSize: '0.875rem'
              }}
            />
          </div>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            style={{
              padding: '0.75rem',
              border: `1px solid ${ui.borderSoft}`,
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              background: ui.panel
            }}
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {formatCategoryLabel(category)}
              </option>
            ))}
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{
              padding: '0.75rem',
              border: `1px solid ${ui.borderSoft}`,
              borderRadius: '0.5rem',
              fontSize: '0.875rem',
              background: ui.panel
            }}
          >
            <option value="all">All Status</option>
            {EVENT_WORKFLOW_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>{status.label}</option>
            ))}
          </select>
        </div>

        {filteredEvents.length > 0 && (
          <div style={{ marginTop: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.85rem', color: ui.textMuted, fontWeight: 600 }}>
              <input
                type="checkbox"
                checked={selectedEvents.length > 0 && selectedEvents.length === filteredEvents.length}
                onChange={(event) => handleSelectAllEvents(event.target.checked)}
              />
              Select all filtered events
            </label>
            {selectedEvents.length > 0 && (
              <div style={{ display: 'inline-flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => handleBulkEventAction('draft')} style={{ padding: '0.45rem 0.7rem', borderRadius: '0.4rem', border: `1px solid ${ui.borderSoft}`, background: ui.panel, color: ui.textMuted, fontWeight: 600, cursor: 'pointer' }}>Draft</button>
                <button type="button" onClick={() => handleBulkEventAction('review')} style={{ padding: '0.45rem 0.7rem', borderRadius: '0.4rem', border: `1px solid ${ui.borderSoft}`, background: ui.panel, color: ui.textMuted, fontWeight: 600, cursor: 'pointer' }}>Review</button>
                {canApprove && (
                  <button type="button" onClick={() => handleBulkEventAction('publish')} style={{ padding: '0.45rem 0.7rem', borderRadius: '0.4rem', border: 'none', background: '#10b981', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Publish</button>
                )}
                <button type="button" onClick={() => handleBulkEventAction('delete')} style={{ padding: '0.45rem 0.7rem', borderRadius: '0.4rem', border: 'none', background: '#ef4444', color: 'white', fontWeight: 700, cursor: 'pointer' }}>Delete</button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Events Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
        {filteredEvents.map((event) => (
          <div
            key={event.id}
            style={{
              background: ui.panel,
              borderRadius: '0.75rem',
              border: `1px solid ${ui.border}`,
              overflow: 'hidden'
            }}
          >
            {event.imageUrl && (
              <img
                src={event.imageUrl}
                alt={event.title}
                style={{ width: '100%', height: '180px', objectFit: 'cover' }}
              />
            )}
            <div style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem', gap: '0.6rem' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', color: ui.textPrimary, flex: 1 }}>
                  {event.title}
                </h3>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input
                    type="checkbox"
                    checked={selectedEvents.includes(String(event.id))}
                    onChange={() => handleSelectEvent(String(event.id))}
                  />
                  <span
                    style={{
                      padding: '0.25rem 0.75rem',
                      borderRadius: '9999px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      background: `${getCategoryColor(event.category)}20`,
                      color: getCategoryColor(event.category)
                    }}
                  >
                    {formatCategoryLabel(event.category)}
                  </span>
                </div>
              </div>

              <div style={{ marginBottom: '0.6rem' }}>
                <span
                  style={{
                    display: 'inline-block',
                    padding: '0.2rem 0.55rem',
                    borderRadius: '999px',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.03em',
                    background: event.status === 'published' ? '#dcfce7' : event.status === 'pending_review' ? '#fef3c7' : event.status === 'approved' ? '#dbeafe' : event.status === 'scheduled' ? '#ede9fe' : '#e5e7eb',
                    color: event.status === 'published' ? '#166534' : event.status === 'pending_review' ? '#92400e' : event.status === 'approved' ? '#1e3a8a' : event.status === 'scheduled' ? '#5b21b6' : '#374151'
                  }}
                >
                  {String(event.status || 'draft').replace('_', ' ')}
                </span>
              </div>
              
              <p style={{ margin: '0 0 1rem', fontSize: '0.875rem', color: ui.textSecondary, lineHeight: '1.5' }}>
                {event.description.substring(0, 100)}...
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: ui.textSecondary }}>
                  <Calendar size={16} />
                  {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: ui.textSecondary }}>
                  <Clock size={16} />
                  {event.time}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: ui.textSecondary }}>
                  <MapPin size={16} />
                  {event.location}
                </div>
                {event.capacity && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', color: ui.textSecondary }}>
                    <Users size={16} />
                    Max {event.capacity} attendees
                  </div>
                )}
                {Array.isArray(event.whatToExpect) && event.whatToExpect.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem' }}>
                    {event.whatToExpect.map((tag) => (
                      <code
                        key={`${event.id}-${tag}`}
                        style={{
                          background: ui.panelSubtle,
                          color: ui.textMuted,
                          borderRadius: '0.3rem',
                          padding: '0.2rem 0.45rem',
                          fontSize: '0.72rem'
                        }}
                      >
                        {tag}
                      </code>
                    ))}
                  </div>
                )}
                <div style={{ fontSize: '0.75rem', color: ui.textFaint }}>
                  Last updated: {formatStamp(event.updatedAt || event.createdAt)}
                </div>
                {event.scheduledPublishAt ? (
                  <div style={{ fontSize: '0.75rem', color: ui.textFaint }}>
                    Scheduled publish: {formatStamp(event.scheduledPublishAt)}
                  </div>
                ) : null}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', borderTop: `1px solid ${ui.border}`, paddingTop: '1rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => handleEdit(event)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: ui.panelSubtle,
                    color: ui.textMuted,
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem'
                  }}
                >
                  <Edit2 size={14} />
                  Edit
                </button>
                <button
                  onClick={() => handleSubmitForReview(event)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: ui.panelSubtle,
                    color: ui.textMuted,
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Review
                </button>
                {canApprove && (
                  <>
                    <button
                      onClick={() => handleApproveEvent(event)}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        background: '#dbeafe',
                        color: '#1d4ed8',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handlePublishEvent(event)}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        background: '#dcfce7',
                        color: '#166534',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Publish
                    </button>
                    <button
                      onClick={() => handleScheduleEvent(event)}
                      style={{
                        flex: 1,
                        padding: '0.5rem',
                        background: '#ede9fe',
                        color: '#5b21b6',
                        border: 'none',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Schedule
                    </button>
                  </>
                )}
                <button
                  onClick={() => handleRollbackEvent(event)}
                  disabled={!Array.isArray(event.versions) || event.versions.length === 0}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: ui.panelSubtle,
                    color: ui.textMuted,
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    opacity: Array.isArray(event.versions) && event.versions.length > 0 ? 1 : 0.55
                  }}
                >
                  Rollback
                </button>
                <button
                  onClick={() => handleDelete(event.id)}
                  style={{
                    flex: 1,
                    padding: '0.5rem',
                    background: '#fee2e2',
                    color: '#991b1b',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.375rem'
                  }}
                >
                  <Trash2 size={14} />
                  Delete
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredEvents.length === 0 && (
        <div style={{ 
          background: ui.panel, 
          padding: '3rem', 
          borderRadius: '0.75rem',
          border: `1px solid ${ui.border}`,
          textAlign: 'center'
        }}>
          <Calendar size={48} style={{ margin: '0 auto 1rem', color: ui.borderSoft }} />
          <p style={{ margin: 0, color: ui.textFaint }}>
            {searchTerm || filterCategory !== 'all' ? 'No events match your search' : 'No events yet. Create your first event!'}
          </p>
        </div>
      )}
    </div>
  )
}

export default EventManager
