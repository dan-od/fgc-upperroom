import { useMemo, useState } from 'react'
import { Download, UserPlus } from 'lucide-react'
import { matchesAdminDateFilter } from '../../../utils/adminDateFilters'
import { useAdminTheme } from '../AdminThemeContext'
import AdminModal from './AdminModal'
import { useVisitorsCrud } from './useVisitorsCrud'
import VisitorFilters from './VisitorFilters'
import VisitorTable from './VisitorTable'

const EMPTY_VISITOR_FORM = { name: '', phone: '', email: '' }

export default function VisitorManager({ currentUser, hasPermission }) {
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
  const [notice, setNotice] = useState(null)
  const [visitorForm, setVisitorForm] = useState(EMPTY_VISITOR_FORM)
  const [visitors, setVisitors] = useState([])

  const [modalConfig, setModalConfig] = useState({
    isOpen: false, title: '', message: '', tone: 'info',
    onConfirm: null, showInput: false, inputValue: '',
    inputPlaceholder: '', confirmLabel: 'Confirm', cancelLabel: 'Cancel', children: null
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
      if (result === false) return
    }
    closeModal()
  }

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

  const { isLoading, isSaving, handleExport, runBulkSubscriptionUpdate, handleAddVisitor } = useVisitorsCrud({
    filteredVisitors,
    visitors,
    setVisitors,
    openModal,
    setNotice,
    selectedVisitors,
    setSelectedVisitors,
    visitorForm,
    setVisitorForm,
    EMPTY_VISITOR_FORM
  })

  return (
    <>
      {notice && (
        <div style={{ padding: '1rem', background: notice.tone === 'success' ? '#dcfce7' : '#fee2e2', color: notice.tone === 'success' ? '#166534' : '#991b1b', borderRadius: '0.5rem', marginBottom: '1.5rem', fontSize: '0.875rem', fontWeight: 500, border: `1px solid ${notice.tone === 'success' ? '#bbf7d0' : '#fecaca'}` }}>
          {notice.text}
        </div>
      )}

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
          <div>
            <h1 style={{ margin: '0 0 0.5rem', fontSize: '2rem', color: ui.textPrimary }}>Visitor Management</h1>
            <p style={{ margin: 0, color: ui.textSecondary }}>Manage WhatsApp subscribers and visitor follow-up from the shared bot database.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <button onClick={handleExport} disabled={isLoading} style={{ padding: '0.75rem 1.25rem', background: ui.panel, color: ui.textMuted, border: `1px solid ${ui.borderSoft}`, borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: isLoading ? 'not-allowed' : 'pointer', opacity: isLoading ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Download size={16} />
              Export CSV
            </button>
            <button onClick={() => handleAddVisitor(ui)} disabled={isSaving} style={{ padding: '0.75rem 1.25rem', background: '#5a4494', color: 'white', border: 'none', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, cursor: isSaving ? 'not-allowed' : 'pointer', opacity: isSaving ? 0.7 : 1, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <UserPlus size={16} />
              Add Visitor
            </button>
          </div>
        </div>

        <VisitorFilters
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          filterStatus={filterStatus}
          setFilterStatus={setFilterStatus}
          filterDate={filterDate}
          setFilterDate={setFilterDate}
          selectedVisitors={selectedVisitors}
          onBulkSubscribe={() => runBulkSubscriptionUpdate(true)}
          onBulkUnsubscribe={() => runBulkSubscriptionUpdate(false)}
          isSaving={isSaving}
          darkMode={darkMode}
          ui={ui}
        />

        <VisitorTable
          visitors={visitors}
          filteredVisitors={filteredVisitors}
          isLoading={isLoading}
          selectedVisitors={selectedVisitors}
          setSelectedVisitors={setSelectedVisitors}
          darkMode={darkMode}
          ui={ui}
        />
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
