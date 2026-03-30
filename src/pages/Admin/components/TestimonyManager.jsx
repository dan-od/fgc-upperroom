import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Plus, Search, Trash2, Edit2 } from 'lucide-react'
import { DropdownSelect } from '../../../components/common'
import { ADMIN_DATE_FILTER_OPTIONS, matchesAdminDateFilter } from '../../../utils/adminDateFilters'
import { readAdminTestimonies, writeAdminTestimonies } from '../../../utils/testimonyStorage'
import AdminModal from './AdminModal'
import './TestimonyManager.css'

const createEmptyTestimony = () => ({
  id: Date.now(),
  name: '',
  role: '',
  quote: '',
  createdAt: null,
  updatedAt: null
})

const TestimonyManager = ({ currentUser = null, hasPermission = () => false }) => {
  const [view, setView] = useState('list')
  const [testimonies, setTestimonies] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState('all')
  const [formData, setFormData] = useState(createEmptyTestimony)
  const [notice, setNotice] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const canWrite = hasPermission('content:testimonies:write')

  // Modal system
  const [modalConfig, setModalConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    tone: 'info',
    onConfirm: null,
    showInput: false,
    inputValue: '',
    inputPlaceholder: '',
    confirmLabel: 'Confirm',
    cancelLabel: 'Cancel'
  })

  const closeModal = () => setModalConfig((prev) => ({ ...prev, isOpen: false }))
  const openModal = (config) => setModalConfig({
    isOpen: true,
    title: config.title || 'Are you sure?',
    message: config.message || '',
    tone: config.tone || 'info',
    onConfirm: config.onConfirm || null,
    showInput: !!config.showInput,
    inputValue: config.initialValue || '',
    inputPlaceholder: config.inputPlaceholder || '',
    confirmLabel: config.confirmLabel || 'Confirm',
    cancelLabel: config.cancelLabel || 'Cancel'
  })

  const handleModalConfirm = () => {
    if (modalConfig.onConfirm) {
      modalConfig.onConfirm(modalConfig.inputValue)
    }
    closeModal()
  }

  useEffect(() => {
    let isMounted = true

    const loadTestimonies = async () => {
      setIsLoading(true)

      try {
        const items = await readAdminTestimonies()
        if (isMounted) {
          setTestimonies(items)
        }
      } catch (error) {
        if (isMounted) {
          setTestimonies([])
          setNotice({ tone: 'error', text: error?.message || 'Unable to load testimonies right now.' })
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    void loadTestimonies()

    return () => {
      isMounted = false
    }
  }, [])

  const persist = async (items) => {
    setIsSaving(true)
    const saved = await writeAdminTestimonies(items)
    setTestimonies(saved)
    setIsSaving(false)
    return saved
  }

  const resetForm = () => {
    setFormData(createEmptyTestimony())
    setView('list')
  }

  const openCreate = () => {
    setNotice(null)
    setFormData(createEmptyTestimony())
    setView('create')
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSave = async () => {
    const name = formData.name.trim()
    const quote = formData.quote.trim()
    const role = formData.role.trim()
    const resolvedName = name || 'Anonymous'

    if (!quote) {
      setNotice({ tone: 'error', text: 'Testimony text is required.' })
      return
    }

    const now = new Date().toISOString()
    const payload = {
      ...formData,
      name: resolvedName,
      role,
      quote,
      updatedAt: now
    }

    if (view === 'create') {
      const newTestimony = {
        ...payload,
        id: Date.now(),
        createdAt: now,
        updatedAt: null
      }

      try {
        await persist([newTestimony, ...testimonies])
        setNotice({
          tone: 'success',
          text: name ? 'Testimony added.' : 'Testimony added as Anonymous.'
        })
        resetForm()
      } catch (error) {
        setIsSaving(false)
        setNotice({ tone: 'error', text: error?.message || 'Unable to save testimony right now.' })
      }
      return
    }

    const updated = testimonies.map((item) => {
      if (item.id !== formData.id) return item
      return { ...item, ...payload }
    })

    try {
      await persist(updated)
      setNotice({
        tone: 'success',
        text: name ? 'Testimony updated.' : 'Testimony updated as Anonymous.'
      })
      resetForm()
    } catch (error) {
      setIsSaving(false)
      setNotice({ tone: 'error', text: error?.message || 'Unable to update testimony right now.' })
    }
  }

  const handleEdit = (item) => {
    setNotice(null)
    setFormData({ ...item })
    setView('edit')
  }

  const handleDelete = (id) => {
    const selected = testimonies.find((item) => item.id === id)
    const confirmMessage = selected
      ? `Delete testimony from ${selected.name}? This cannot be undone.`
      : 'Delete this testimony? This cannot be undone.'

    openModal({
      title: 'Delete Testimony',
      message: confirmMessage,
      tone: 'danger',
      confirmLabel: 'Delete',
      onConfirm: async () => {
        try {
          await persist(testimonies.filter((item) => item.id !== id))
          setNotice({ tone: 'success', text: 'Testimony removed.' })
        } catch (error) {
          setIsSaving(false)
          setNotice({ tone: 'error', text: error?.message || 'Unable to delete testimony right now.' })
        }
      }
    })
  }

  const formatStamp = (value) => {
    if (!value) {
      return 'Not updated yet'
    }

    const stamp = new Date(value)
    if (Number.isNaN(stamp.getTime())) {
      return 'Unknown'
    }

    return stamp.toLocaleString()
  }

  const filtered = useMemo(() => {
    const term = searchTerm.toLowerCase()
    return testimonies.filter((item) => {
      return (
        item.name.toLowerCase().includes(term) ||
        item.role.toLowerCase().includes(term) ||
        item.quote.toLowerCase().includes(term)
      )
    }).filter((item) => matchesAdminDateFilter(item.updatedAt || item.createdAt, filterDate))
  }, [testimonies, searchTerm, filterDate])

  const stats = useMemo(() => {
    return {
      total: testimonies.length
    }
  }, [testimonies])

  if (view === 'create' || view === 'edit') {
    return (
      <div className="admin-testimony admin-testimony--editor">
        {notice && (
          <div className={`admin-testimony__notice admin-testimony__notice--${notice.tone}`}>
            {notice.text}
          </div>
        )}

        <div className="admin-testimony__editor-head">
          <button type="button" onClick={resetForm} className="admin-testimony__ghost-btn">
            ← Back to Testimonies
          </button>
          <div>
            <h1>{view === 'create' ? 'Add Testimony' : 'Edit Testimony'}</h1>
            <p>Share stories of life change by adding new testimonies.</p>
          </div>
        </div>

        <form className="admin-testimony__form" onSubmit={(e) => { e.preventDefault(); void handleSave() }}>
          <label className="admin-testimony__field">
            <span>Name</span>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="Member Name (optional)"
            />
          </label>

          <label className="admin-testimony__field">
            <span>Role / Title</span>
            <input
              type="text"
              name="role"
              value={formData.role}
              onChange={handleChange}
              placeholder="Youth Member"
            />
          </label>

          <label className="admin-testimony__field">
            <span>Testimony</span>
            <textarea
              name="quote"
              value={formData.quote}
              onChange={handleChange}
              rows={8}
              required
              placeholder="Share the testimony..."
            />
          </label>

          <div className="admin-testimony__actions">
            <button type="submit" className="admin-testimony__primary-btn">
              {isSaving ? 'Saving...' : view === 'create' ? 'Add Testimony' : 'Update Testimony'}
            </button>
            <button type="button" onClick={resetForm} className="admin-testimony__ghost-btn">
              Cancel
            </button>
          </div>
        </form>
      </div>
    )
  }

  return (
    <div className="admin-testimony">
      {notice && <div className={`admin-testimony__notice admin-testimony__notice--${notice.tone}`}>{notice.text}</div>}

      <div className="admin-testimony__head">
        <div>
          <h1>Testimonies</h1>
          <p>Create, edit, and manage member testimonies shown on the public site.</p>
        </div>
        {canWrite && (
          <button type="button" onClick={openCreate} className="admin-testimony__primary-btn">
            <Plus size={16} />
            <span>New Testimony</span>
          </button>
        )}
      </div>

      <div className="admin-testimony__stats">
        <div className="admin-testimony__stat-card">
          <span>Total Testimonies</span>
          <strong>{stats.total}</strong>
        </div>
      </div>

      <div className="admin-testimony__filters">
        <label className="admin-testimony__search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search testimonies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </label>
        <DropdownSelect
          value={filterDate}
          onChange={(event) => setFilterDate(event.target.value)}
          wrapperClassName="admin-testimony__date-filter"
        >
          {ADMIN_DATE_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </DropdownSelect>
      </div>

      <div className="admin-testimony__list">
        {isLoading ? (
          <div className="admin-testimony__empty">
            <p>Loading testimonies...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="admin-testimony__empty">
            <p>No testimonies found.</p>
            <p>Use the button above to add your first testimony.</p>
          </div>
        ) : (
          filtered.map((item) => (
            <div key={item.id} className="admin-testimony__item">
              <div className="admin-testimony__body">
                <h3>{item.name}</h3>
                <p className="admin-testimony__role">{item.role}</p>
                <blockquote>{item.quote}</blockquote>
                <p className="admin-testimony__meta">
                  Last updated: {formatStamp(item.updatedAt || item.createdAt)}
                </p>
              </div>
              {canWrite && (
                <div className="admin-testimony__actions">
                  <button onClick={() => handleEdit(item)} className="admin-testimony__icon-btn" title="Edit">
                    <Edit2 size={16} />
                  </button>
                  <button onClick={() => handleDelete(item.id)} className="admin-testimony__icon-btn" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default TestimonyManager
