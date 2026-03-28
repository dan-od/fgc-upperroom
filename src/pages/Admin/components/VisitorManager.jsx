import { useEffect, useMemo, useState } from 'react'
import { Download, Search, UserPlus, UserX } from 'lucide-react'
import { DropdownSelect } from '../../../components/common'
import { ADMIN_DATE_FILTER_OPTIONS, matchesAdminDateFilter } from '../../../utils/adminDateFilters'
import { createVisitorRecord, fetchVisitors, updateVisitorSubscriptionStatus } from '../../../utils/visitorApi'
import { useAdminTheme } from '../AdminThemeContext'
import AdminModal from './AdminModal'

const EMPTY_VISITOR_FORM = {
  name: '',
  phone: '',
  email: ''
}

const VisitorManager = () => {
  const { darkMode } = useAdminTheme()
  const ui = {
    panel: darkMode ? '#1a2235' : 'white',
    panelSubtle: darkMode ? '#222c40' : '#f3f4f6',
    border: darkMode ? '#2a3550' : '#e5e7eb',
    borderSoft: darkMode ? '#3a4866' : '#d1d5db',
    textPrimary: darkMode ? '#e2e8f0' : '#111827',
    textSecondary: darkMode ? '#94afd4' : '#6b7280',
    textMuted: darkMode ? '#c3d4ef' : '#374151',
    textFaint: darkMode ? '#7f93b3' : '#9ca3af'
  }

  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterDate, setFilterDate] = useState('all')
  const [selectedVisitors, setSelectedVisitors] = useState([])
  const [visitors, setVisitors] = useState([])
  const [notice, setNotice] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [visitorForm, setVisitorForm] = useState(EMPTY_VISITOR_FORM)

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
    cancelLabel: 'Cancel',
    children: null
  })

  const closeModal = () => {
    setModalConfig((prev) => ({ ...prev, isOpen: false, children: null }))
    setVisitorForm(EMPTY_VISITOR_FORM)
  }

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
    cancelLabel: config.cancelLabel || 'Cancel',
    children: config.children || null
  })

  const handleModalConfirm = async () => {
    if (modalConfig.onConfirm) {
      const result = await modalConfig.onConfirm(modalConfig.inputValue)
      if (result === false) {
        return
      }
    }
    closeModal()
  }

  const refreshVisitors = async ({ silent = false } = {}) => {
    if (!silent) {
      setIsLoading(true)
    }

    try {
      const nextVisitors = await fetchVisitors()
      setVisitors(nextVisitors)
      return nextVisitors
    } catch (error) {
      setNotice({ tone: 'error', text: error?.message || 'Unable to load visitors right now.' })
      return []
    } finally {
      if (!silent) {
        setIsLoading(false)
      }
    }
  }

  useEffect(() => {
    void refreshVisitors()
  }, [])

  useEffect(() => {
    const validIds = new Set(visitors.map((visitor) => String(visitor.id)))
    setSelectedVisitors((prev) => prev.filter((id) => validIds.has(String(id))))
  }, [visitors])

  const filteredVisitors = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()

    return visitors.filter((visitor) => {
      const matchesSearch =
        !term ||
        visitor.name.toLowerCase().includes(term) ||
        visitor.phone.toLowerCase().includes(term) ||
        visitor.email.toLowerCase().includes(term)

      const matchesStatus =
        filterStatus === 'all' ||
        (filterStatus === 'subscribed' && visitor.subscribed) ||
        (filterStatus === 'unsubscribed' && !visitor.subscribed)

      const matchesDate = matchesAdminDateFilter(visitor.lastContact || visitor.firstVisit, filterDate)
      return matchesSearch && matchesStatus && matchesDate
    })
  }, [visitors, searchTerm, filterStatus, filterDate])

  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedVisitors(filteredVisitors.map((visitor) => String(visitor.id)))
      return
    }
    setSelectedVisitors([])
  }

  const handleSelectVisitor = (id) => {
    const resolvedId = String(id)
    setSelectedVisitors((prev) => (
      prev.includes(resolvedId) ? prev.filter((item) => item !== resolvedId) : [...prev, resolvedId]
    ))
  }

  const handleExport = () => {
    const escapeCsv = (value) => {
      const text = String(value ?? '')
      return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
    }

    const csv = [
      ['Name', 'Phone', 'Email', 'First Visit', 'Subscribed', 'Tags', 'Last Contact'].join(','),
      ...filteredVisitors.map((visitor) => (
        [
          visitor.name,
          visitor.phone,
          visitor.email || '',
          visitor.firstVisit || '',
          visitor.subscribed ? 'Yes' : 'No',
          visitor.tags.join('; '),
          visitor.lastContact || ''
        ].map(escapeCsv).join(',')
      ))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `visitors-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const runBulkSubscriptionUpdate = async (isSubscribed) => {
    if (!selectedVisitors.length) {
      return
    }

    const targets = visitors.filter((visitor) => selectedVisitors.includes(String(visitor.id)))
    if (!targets.length) {
      return
    }

    setIsSaving(true)
    setNotice(null)

    try {
      await Promise.all(
        targets.map((visitor) => updateVisitorSubscriptionStatus(visitor.phone, isSubscribed))
      )
      await refreshVisitors({ silent: true })
      setSelectedVisitors([])
      openModal({
        title: isSubscribed ? 'Success' : 'Action Completed',
        message: isSubscribed
          ? `${targets.length} visitor${targets.length > 1 ? 's have' : ' has'} been subscribed successfully.`
          : `${targets.length} visitor${targets.length > 1 ? 's have' : ' has'} been unsubscribed successfully.`,
        tone: isSubscribed ? 'success' : 'info',
        confirmLabel: 'Done'
      })
    } catch (error) {
      setNotice({ tone: 'error', text: error?.message || 'Unable to update visitor subscriptions right now.' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddVisitor = () => {
    setVisitorForm(EMPTY_VISITOR_FORM)
    openModal({
      title: 'Add New Visitor',
      message: 'Enter visitor details to save them to the shared visitor list.',
      confirmLabel: 'Add Visitor',
      onConfirm: async () => {
        const name = visitorForm.name.trim()
        const phoneNumber = visitorForm.phone.trim()
        const email = visitorForm.email.trim()

        if (!name || !phoneNumber) {
          setNotice({ tone: 'error', text: 'Visitor name and phone number are required.' })
          return false
        }

        setIsSaving(true)
        setNotice(null)

        try {
          await createVisitorRecord({
            name,
            phoneNumber,
            email,
            firstVisitDate: new Date().toISOString().slice(0, 10),
            tags: ['new']
          })
          await refreshVisitors({ silent: true })
          setNotice({ tone: 'success', text: 'Visitor added successfully.' })
          return true
        } catch (error) {
          setNotice({ tone: 'error', text: error?.message || 'Unable to add visitor right now.' })
          return false
        } finally {
          setIsSaving(false)
        }
      },
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: ui.textSecondary, marginBottom: '0.35rem' }}>Full Name</label>
            <input
              type="text"
              value={visitorForm.name}
              placeholder="John Doe"
              onChange={(event) => setVisitorForm((prev) => ({ ...prev, name: event.target.value }))}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: ui.panelSubtle,
                border: `1px solid ${ui.border}`,
                borderRadius: '0.5rem',
                color: ui.textPrimary,
                outline: 'none'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: ui.textSecondary, marginBottom: '0.35rem' }}>Phone Number</label>
            <input
              type="text"
              value={visitorForm.phone}
              placeholder="+234..."
              onChange={(event) => setVisitorForm((prev) => ({ ...prev, phone: event.target.value }))}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: ui.panelSubtle,
                border: `1px solid ${ui.border}`,
                borderRadius: '0.5rem',
                color: ui.textPrimary,
                outline: 'none'
              }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: ui.textSecondary, marginBottom: '0.35rem' }}>Email Address</label>
            <input
              type="email"
              value={visitorForm.email}
              placeholder="visitor@example.com"
              onChange={(event) => setVisitorForm((prev) => ({ ...prev, email: event.target.value }))}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: ui.panelSubtle,
                border: `1px solid ${ui.border}`,
                borderRadius: '0.5rem',
                color: ui.textPrimary,
                outline: 'none'
              }}
            />
          </div>
        </div>
      )
    })
  }

  return (
    <>
      {notice && (
        <div style={{
          padding: '1rem',
          background: notice.tone === 'success' ? '#dcfce7' : '#fee2e2',
          color: notice.tone === 'success' ? '#166534' : '#991b1b',
          borderRadius: '0.5rem',
          marginBottom: '1.5rem',
          fontSize: '0.875rem',
          fontWeight: 500,
          border: `1px solid ${notice.tone === 'success' ? '#bbf7d0' : '#fecaca'}`
        }}>
          {notice.text}
        </div>
      )}

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', color: ui.textPrimary }}>
              Visitor Management
            </h1>
            <p style={{ margin: 0, color: ui.textSecondary }}>
              Manage WhatsApp subscribers and visitor follow-up from the shared bot database.
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button
              onClick={handleExport}
              disabled={isLoading}
              style={{
                padding: '0.75rem 1.25rem',
                background: ui.panel,
                color: ui.textMuted,
                border: `1px solid ${ui.borderSoft}`,
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <Download size={16} />
              Export CSV
            </button>
            <button
              onClick={handleAddVisitor}
              disabled={isSaving}
              style={{
                padding: '0.75rem 1.25rem',
                background: '#5a4494',
                color: 'white',
                border: 'none',
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                cursor: isSaving ? 'not-allowed' : 'pointer',
                opacity: isSaving ? 0.7 : 1,
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}
            >
              <UserPlus size={16} />
              Add Visitor
            </button>
          </div>
        </div>

        <div style={{
          background: ui.panel,
          padding: '1.5rem',
          borderRadius: '0.75rem',
          border: `1px solid ${ui.border}`,
          marginBottom: '1.5rem'
        }}>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <div style={{ flex: '1', minWidth: '280px', position: 'relative' }}>
              <Search size={18} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: ui.textFaint }} />
              <input
                type="text"
                placeholder="Search by name, phone, or email..."
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                style={{
                  width: '100%',
                  padding: '0.75rem 0.75rem 0.75rem 2.5rem',
                  border: `1px solid ${ui.borderSoft}`,
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem'
                }}
              />
            </div>
            <DropdownSelect
              value={filterStatus}
              onChange={(event) => setFilterStatus(event.target.value)}
              style={{
                padding: '0.75rem',
                border: `1px solid ${ui.borderSoft}`,
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                background: ui.panel
              }}
            >
              <option value="all">All Visitors</option>
              <option value="subscribed">Subscribed</option>
              <option value="unsubscribed">Unsubscribed</option>
            </DropdownSelect>
            <DropdownSelect
              value={filterDate}
              onChange={(event) => setFilterDate(event.target.value)}
              style={{
                padding: '0.75rem',
                border: `1px solid ${ui.borderSoft}`,
                borderRadius: '0.5rem',
                fontSize: '0.875rem',
                background: ui.panel
              }}
            >
              {ADMIN_DATE_FILTER_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </DropdownSelect>
          </div>

          {selectedVisitors.length > 0 && (
            <div style={{
              padding: '0.75rem 1rem',
              background: ui.panelSubtle,
              borderRadius: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
              flexWrap: 'wrap',
              marginBottom: '1rem'
            }}>
              <span style={{ fontSize: '0.875rem', color: ui.textMuted, fontWeight: 600 }}>
                {selectedVisitors.length} selected
              </span>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <button
                  onClick={() => void runBulkSubscriptionUpdate(true)}
                  disabled={isSaving}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    opacity: isSaving ? 0.7 : 1
                  }}
                >
                  <UserPlus size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                  Subscribe
                </button>
                <button
                  onClick={() => void runBulkSubscriptionUpdate(false)}
                  disabled={isSaving}
                  style={{
                    padding: '0.5rem 1rem',
                    background: '#ef4444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '0.375rem',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    cursor: isSaving ? 'not-allowed' : 'pointer',
                    opacity: isSaving ? 0.7 : 1
                  }}
                >
                  <UserX size={14} style={{ display: 'inline', marginRight: '0.25rem' }} />
                  Unsubscribe
                </button>
              </div>
            </div>
          )}

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: `2px solid ${ui.border}` }}>
                  <th style={{ padding: '0.75rem', textAlign: 'left' }}>
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedVisitors.length > 0 && selectedVisitors.length === filteredVisitors.length}
                      style={{ cursor: 'pointer' }}
                    />
                  </th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: ui.textSecondary, textTransform: 'uppercase' }}>S/N</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: ui.textSecondary, textTransform: 'uppercase' }}>Name</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: ui.textSecondary, textTransform: 'uppercase' }}>Phone</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: ui.textSecondary, textTransform: 'uppercase' }}>Email</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: ui.textSecondary, textTransform: 'uppercase' }}>First Visit</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: ui.textSecondary, textTransform: 'uppercase' }}>Status</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: ui.textSecondary, textTransform: 'uppercase' }}>Tags</th>
                  <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: '0.75rem', fontWeight: 600, color: ui.textSecondary, textTransform: 'uppercase' }}>Last Contact</th>
                </tr>
              </thead>
              <tbody>
                {!isLoading && filteredVisitors.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ padding: '1.5rem', textAlign: 'center', color: ui.textSecondary }}>
                      No visitors match your current filters.
                    </td>
                  </tr>
                )}

                {isLoading && (
                  <tr>
                    <td colSpan={9} style={{ padding: '1.5rem', textAlign: 'center', color: ui.textSecondary }}>
                      Loading visitors...
                    </td>
                  </tr>
                )}

                {!isLoading && filteredVisitors.map((visitor, index) => (
                  <tr key={visitor.id} style={{ borderBottom: `1px solid ${ui.border}` }}>
                    <td style={{ padding: '1rem' }}>
                      <input
                        type="checkbox"
                        checked={selectedVisitors.includes(String(visitor.id))}
                        onChange={() => handleSelectVisitor(visitor.id)}
                        style={{ cursor: 'pointer' }}
                      />
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.82rem', fontWeight: 700, color: ui.textSecondary }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', fontWeight: 500, color: ui.textPrimary }}>
                      {visitor.name}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: ui.textSecondary }}>
                      {visitor.phone}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: ui.textSecondary }}>
                      {visitor.email || 'No email'}
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: ui.textSecondary }}>
                      {visitor.firstVisit || 'Unknown'}
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <span style={{
                        padding: '0.25rem 0.75rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        background: visitor.subscribed ? '#d1fae5' : '#fee2e2',
                        color: visitor.subscribed ? '#065f46' : '#991b1b'
                      }}>
                        {visitor.subscribed ? 'Subscribed' : 'Unsubscribed'}
                      </span>
                    </td>
                    <td style={{ padding: '1rem' }}>
                      <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
                        {(visitor.tags || []).length > 0
                          ? visitor.tags.map((tag) => (
                              <span
                                key={`${visitor.id}-${tag}`}
                                style={{
                                  padding: '0.125rem 0.5rem',
                                  borderRadius: '0.25rem',
                                  fontSize: '0.75rem',
                                  background: ui.panelSubtle,
                                  color: ui.textMuted
                                }}
                              >
                                {tag}
                              </span>
                            ))
                          : <span style={{ fontSize: '0.75rem', color: ui.textFaint }}>No tags</span>}
                      </div>
                    </td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem', color: ui.textSecondary }}>
                      {visitor.lastContact || 'Never'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '1rem', fontSize: '0.875rem', color: ui.textSecondary, textAlign: 'center' }}>
            Showing {filteredVisitors.length} of {visitors.length} visitors
          </div>
        </div>
      </div>

      <AdminModal
        isOpen={modalConfig.isOpen}
        onClose={closeModal}
        title={modalConfig.title}
        tone={modalConfig.tone}
        onConfirm={() => void handleModalConfirm()}
        showInput={modalConfig.showInput}
        inputValue={modalConfig.inputValue}
        onInputChange={(value) => setModalConfig((prev) => ({ ...prev, inputValue: value }))}
        inputPlaceholder={modalConfig.inputPlaceholder}
        confirmLabel={isSaving ? 'Working...' : modalConfig.confirmLabel}
        cancelLabel={modalConfig.cancelLabel}
      >
        <p style={{ margin: 0 }}>{modalConfig.message}</p>
        {modalConfig.children}
      </AdminModal>
    </>
  )
}

export default VisitorManager
