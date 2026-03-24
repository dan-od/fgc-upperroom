import { useEffect, useMemo, useState } from 'react'
import { BookOpen, Plus, Search, Trash2, Edit2 } from 'lucide-react'
import { readTestimonies, seedTestimoniesIfEmpty, writeTestimonies } from '../../../utils/testimonyStorage'
import './TestimonyManager.css'

const createEmptyTestimony = () => ({
  id: Date.now(),
  name: '',
  role: '',
  quote: '',
  createdAt: null,
  updatedAt: null
})

const TestimonyManager = () => {
  const [view, setView] = useState('list')
  const [testimonies, setTestimonies] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState(createEmptyTestimony)
  const [notice, setNotice] = useState(null)

  useEffect(() => {
    setTestimonies(seedTestimoniesIfEmpty())
  }, [])

  const persist = (items) => {
    setTestimonies(items)
    writeTestimonies(items)
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

  const handleSave = () => {
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

      persist([newTestimony, ...testimonies])
      setNotice({
        tone: 'success',
        text: name ? 'Testimony added.' : 'Testimony added as Anonymous.'
      })
      resetForm()
      return
    }

    const updated = testimonies.map((item) => {
      if (item.id !== formData.id) return item
      return { ...item, ...payload }
    })

    persist(updated)
    setNotice({
      tone: 'success',
      text: name ? 'Testimony updated.' : 'Testimony updated as Anonymous.'
    })
    resetForm()
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

    if (!window.confirm(confirmMessage)) return

    persist(testimonies.filter((item) => item.id !== id))
    setNotice({ tone: 'success', text: 'Testimony removed.' })
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
    })
  }, [testimonies, searchTerm])

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

        <form className="admin-testimony__form" onSubmit={(e) => { e.preventDefault(); handleSave() }}>
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
              {view === 'create' ? 'Add Testimony' : 'Update Testimony'}
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
        <button type="button" onClick={openCreate} className="admin-testimony__primary-btn">
          <Plus size={16} />
          <span>New Testimony</span>
        </button>
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
      </div>

      <div className="admin-testimony__list">
        {filtered.length === 0 ? (
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
              <div className="admin-testimony__actions">
                <button onClick={() => handleEdit(item)} className="admin-testimony__icon-btn" title="Edit">
                  <Edit2 size={16} />
                </button>
                <button onClick={() => handleDelete(item.id)} className="admin-testimony__icon-btn" title="Delete">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default TestimonyManager
