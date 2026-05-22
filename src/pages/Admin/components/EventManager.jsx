import { useState, useEffect, useRef } from 'react'
import { matchesAdminDateFilter } from '../../../utils/adminDateFilters'
import { createDefaultRegistrationMethods } from '../../../utils/eventsApi'
import { useAdminTheme } from '../AdminThemeContext'
import AdminModal from './AdminModal'
import { DEFAULT_EVENT_CATEGORIES, normalizeCategory } from './eventManagerUtils'
import { useEventCrud } from './useEventCrud'
import EventForm from './EventForm'
import EventList from './EventList'

export default function EventManager({ currentUser = null, hasPermission = () => false }) {
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

  const [view, setView] = useState('list')
  const [events, setEvents] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDate, setFilterDate] = useState('all')
  const [selectedEvents, setSelectedEvents] = useState([])
  const [notice, setNotice] = useState(null)
  const [tagInput, setTagInput] = useState('')
  const [isImageUploading, setIsImageUploading] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [categories, setCategories] = useState(DEFAULT_EVENT_CATEGORIES)
  const [newCategoryInput, setNewCategoryInput] = useState('')
  const imageFileInputRef = useRef(null)
  const [formData, setFormData] = useState({
    id: Date.now(), title: '', description: '', date: '', time: '', location: '',
    category: 'general', capacity: '', registrationRequired: false, registrationLink: '/contact',
    registrationMethods: createDefaultRegistrationMethods(), status: 'draft',
    scheduledPublishAt: '', publishedAt: '',
    workflow: { submittedAt: '', reviewedBy: '', approvedBy: '', rejectedReason: '' },
    versions: [], whatToExpect: [], imageUrl: '', createdAt: null, updatedAt: null
  })

  const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', tone: 'info', onConfirm: null, showInput: false, inputValue: '', inputPlaceholder: '', confirmLabel: 'Confirm', cancelLabel: 'Cancel' })
  const closeModal = () => setModalConfig((prev) => ({ ...prev, isOpen: false }))
  const openModal = (config) => setModalConfig({ isOpen: true, title: config.title || 'Are you sure?', message: config.message || '', tone: config.tone || 'info', onConfirm: config.onConfirm || null, showInput: !!config.showInput, inputValue: config.initialValue || '', inputPlaceholder: config.inputPlaceholder || '', confirmLabel: config.confirmLabel || 'Confirm', cancelLabel: config.cancelLabel || 'Cancel' })
  const handleModalConfirm = () => { if (modalConfig.onConfirm) modalConfig.onConfirm(modalConfig.inputValue); closeModal() }

  const crud = useEventCrud({ currentUser, hasPermission, events, setEvents, setNotice, categories, setCategories, setView, setFormData, setTagInput, setNewCategoryInput, setIsLoading, openModal })

  useEffect(() => {
    let isMounted = true
    const load = async () => {
      try { await crud.refreshEvents() } catch { if (isMounted) { setEvents([]); setCategories(DEFAULT_EVENT_CATEGORIES) } }
    }
    void load()
    return () => { isMounted = false }
  }, [])

  useEffect(() => {
    const ids = new Set(events.map((e) => String(e.id)))
    setSelectedEvents((prev) => prev.filter((id) => ids.has(String(id))))
  }, [events])

  const filteredEvents = events.filter((event) => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) || event.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = filterCategory === 'all' || normalizeCategory(event.category) === filterCategory
    const matchesStatus = filterStatus === 'all' || String(event.status || '').toLowerCase() === filterStatus
    const matchesDate = matchesAdminDateFilter(event.date || event.updatedAt || event.createdAt, filterDate)
    return matchesSearch && matchesCategory && matchesStatus && matchesDate
  })

  if (view === 'create' || view === 'edit') {
    return (
      <>
        <EventForm
          formData={formData} setFormData={setFormData}
          categories={categories} setCategories={setCategories}
          newCategoryInput={newCategoryInput} setNewCategoryInput={setNewCategoryInput}
          tagInput={tagInput} setTagInput={setTagInput}
          onSubmit={(e) => { e.preventDefault(); void crud.handleSubmitWithData(formData, view) }}
          onCancel={crud.resetForm}
          isImageUploading={isImageUploading} setIsImageUploading={setIsImageUploading}
          imageFileInputRef={imageFileInputRef}
          notice={notice} setNotice={setNotice}
          view={view} canWrite={crud.canWrite} canPublish={crud.canPublish}
          darkMode={darkMode} ui={ui}
        />
        <AdminModal isOpen={modalConfig.isOpen} onClose={closeModal} title={modalConfig.title} tone={modalConfig.tone} onConfirm={handleModalConfirm} showInput={modalConfig.showInput} inputValue={modalConfig.inputValue} onInputChange={(val) => setModalConfig((prev) => ({ ...prev, inputValue: val }))} inputPlaceholder={modalConfig.inputPlaceholder} confirmLabel={modalConfig.confirmLabel} cancelLabel={modalConfig.cancelLabel}>
          <p style={{ margin: 0 }}>{modalConfig.message}</p>
        </AdminModal>
      </>
    )
  }

  return (
    <>
      <EventList
        events={events} filteredEvents={filteredEvents}
        selectedEvents={selectedEvents} setSelectedEvents={setSelectedEvents}
        onEdit={crud.handleEdit} onDelete={crud.handleDelete}
        onSubmitForReview={crud.handleSubmitForReview} onApprove={crud.handleApproveEvent}
        onPublish={crud.handlePublishEvent} onSchedule={crud.handleScheduleEvent}
        onRollback={crud.handleRollbackEvent}
        onBulkDelete={crud.handleBulkDelete} onBulkStatusChange={crud.handleBulkStatusChange}
        searchTerm={searchTerm} setSearchTerm={setSearchTerm}
        filterCategory={filterCategory} setFilterCategory={setFilterCategory}
        filterStatus={filterStatus} setFilterStatus={setFilterStatus}
        filterDate={filterDate} setFilterDate={setFilterDate}
        categories={categories} notice={notice} isLoading={isLoading}
        canWrite={crud.canWrite} canPublish={crud.canPublish} canApprove={crud.canApprove}
        onCreateNew={() => setView('create')}
        darkMode={darkMode} ui={ui}
      />
      <AdminModal isOpen={modalConfig.isOpen} onClose={closeModal} title={modalConfig.title} tone={modalConfig.tone} onConfirm={handleModalConfirm} showInput={modalConfig.showInput} inputValue={modalConfig.inputValue} onInputChange={(val) => setModalConfig((prev) => ({ ...prev, inputValue: val }))} inputPlaceholder={modalConfig.inputPlaceholder} confirmLabel={modalConfig.confirmLabel} cancelLabel={modalConfig.cancelLabel}>
        <p style={{ margin: 0 }}>{modalConfig.message}</p>
      </AdminModal>
    </>
  )
}
