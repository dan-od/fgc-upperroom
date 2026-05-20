import { useEffect, useMemo, useState } from 'react'
import { AlertTriangle, CheckCircle, Loader2, Plus, RefreshCw, Search, X } from 'lucide-react'
import { useAdminTheme } from '../AdminThemeContext'
import { fetchAdminUsers } from '../../../utils/adminApi'
import { DropdownSelect } from '../../../components/common'
import { ADMIN_DATE_FILTER_OPTIONS, matchesAdminDateFilter } from '../../../utils/adminDateFilters'
import { ROLE_META } from '../../../utils/adminConstants'
import AdminModal from './AdminModal'
import UserList from './UserList'
import { useUsersCrud } from './useUsersCrud'
import CreateUserForm from './CreateUserForm'

export default function AdminUsers({ currentUser, hasPermission = () => false }) {
  const { darkMode } = useAdminTheme()
  const isSuperAdmin = hasPermission('admin:users:manage')

  const panelBg = darkMode ? '#1a2235' : '#ffffff'
  const panelBorder = darkMode ? '#2a3550' : '#e5e7eb'
  const inputBg = darkMode ? '#131b2e' : '#ffffff'
  const textPrimary = darkMode ? '#e2e8f0' : '#111827'
  const textSecondary = darkMode ? '#7f93b3' : '#6b7280'
  const subtleSurface = darkMode ? '#222c40' : '#f9fafb'

  const btnBase = { display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1rem', borderRadius: '0.5rem', fontSize: '0.875rem', fontWeight: 600, border: 'none', cursor: 'pointer', transition: 'opacity 0.15s' }
  const inputStyle = { padding: '0.65rem 0.75rem', border: `1px solid ${panelBorder}`, borderRadius: '0.5rem', fontSize: '0.925rem', background: inputBg, color: textPrimary, width: '100%', boxSizing: 'border-box' }

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusMsg, setStatusMsg] = useState({ tone: '', message: '' })
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showMatrix, setShowMatrix] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState('all')
  const [editingNameId, setEditingNameId] = useState(null)
  const [editingNameValue, setEditingNameValue] = useState('')
  const [newForm, setNewForm] = useState({ name: '', email: '', role: 'editor', password: '' })
  const [creatingUser, setCreatingUser] = useState(false)

  const showStatus = (tone, message, durationMs = 4000) => {
    setStatusMsg({ tone, message })
    if (durationMs > 0) setTimeout(() => setStatusMsg({ tone: '', message: '' }), durationMs)
  }

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const result = await fetchAdminUsers()
      setUsers(result?.users || [])
    } catch (err) {
      setError(err?.message || 'Failed to load admin users.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const filteredUsers = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    return users.filter((user) => {
      const matchesSearch = !term || String(user.name || '').toLowerCase().includes(term) || String(user.email || '').toLowerCase().includes(term) || String(user.role || '').toLowerCase().includes(term)
      const matchesDate = matchesAdminDateFilter(user.createdAt || user.updatedAt || user.lastLoginAt, filterDate)
      return matchesSearch && matchesDate
    })
  }, [filterDate, searchTerm, users])

  const crud = useUsersCrud({ showStatus, setUsers, load })
  const { regeneratedPasswords, passwordTimers, generatePassword } = crud

  const handlers = {
    ...crud,
    editingNameId, setEditingNameId,
    editingNameValue, setEditingNameValue,
    isSuperAdmin
  }

  const ui = { panelBg, panelBorder, inputBg, textPrimary, textSecondary, subtleSurface, btnBase, inputStyle }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: textPrimary }}>Admin Users</h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.875rem', color: textSecondary }}>
            {loading ? 'Loading…' : `${filteredUsers.length} admin account${filteredUsers.length !== 1 ? 's' : ''} shown`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button type="button" onClick={load} style={{ ...btnBase, background: subtleSurface, color: textSecondary }} disabled={loading}>
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          {isSuperAdmin && (
            <button type="button" onClick={() => setShowCreateForm(v => !v)} style={{ ...btnBase, background: '#5a4494', color: '#fff' }}>
              {showCreateForm ? <X size={15} /> : <Plus size={15} />}
              {showCreateForm ? 'Cancel' : 'Add Admin'}
            </button>
          )}
        </div>
      </div>

      {/* Status message */}
      {statusMsg.message && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '0.5rem', background: statusMsg.tone === 'success' ? (darkMode ? '#083127' : '#ecfdf5') : (darkMode ? '#3b0c0c' : '#fef2f2'), border: `1px solid ${statusMsg.tone === 'success' ? '#6ee7b7' : '#fecaca'}`, color: statusMsg.tone === 'success' ? (darkMode ? '#6ee7b7' : '#065f46') : (darkMode ? '#fca5a5' : '#991b1b'), fontSize: '0.875rem' }}>
          {statusMsg.tone === 'success' ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
          {statusMsg.message}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div style={{ padding: '1rem', borderRadius: '0.5rem', background: darkMode ? '#3b0c0c' : '#fef2f2', color: darkMode ? '#fca5a5' : '#991b1b', fontSize: '0.875rem' }}>
          {error}
        </div>
      )}

      {/* Search + date filter */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) 220px', gap: '0.75rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.75rem', border: `1px solid ${panelBorder}`, borderRadius: '0.65rem', background: inputBg }}>
          <Search size={16} style={{ color: textSecondary }} />
          <input type="text" placeholder="Search admin users..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} style={{ border: 'none', outline: 'none', background: 'transparent', color: textPrimary, width: '100%', padding: '0.75rem 0' }} />
        </label>
        <DropdownSelect value={filterDate} onChange={(e) => setFilterDate(e.target.value)} style={inputStyle}>
          {ADMIN_DATE_FILTER_OPTIONS.map((opt) => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
        </DropdownSelect>
      </div>

      {/* Add Admin Modal */}
      <AdminModal isOpen={showCreateForm} onClose={() => setShowCreateForm(false)} title="Add New Admin" tone="info" maxWidth="600px"
        footer={
          <>
            <button type="button" onClick={() => setShowCreateForm(false)} style={{ ...btnBase, background: subtleSurface, color: textSecondary }}>Cancel</button>
            <button type="button" onClick={() => crud.handleCreateUser({ newForm, setNewForm, setShowCreateForm, setCreatingUser })} disabled={creatingUser} style={{ ...btnBase, background: '#5a4494', color: '#fff', opacity: creatingUser ? 0.7 : 1 }}>
              {creatingUser ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={15} />}
              {creatingUser ? 'Creating…' : 'Create Admin'}
            </button>
          </>
        }
      >
        <form onSubmit={(e) => { e.preventDefault(); crud.handleCreateUser({ newForm, setNewForm, setShowCreateForm, setCreatingUser }) }}>
          <CreateUserForm formData={newForm} setFormData={setNewForm} darkMode={darkMode} ui={ui} generatePassword={crud.generatePassword} />
        </form>
      </AdminModal>

      {/* User list + permission matrix */}
      <UserList
        users={filteredUsers}
        loading={loading}
        handlers={handlers}
        regeneratedPasswords={regeneratedPasswords}
        passwordTimers={passwordTimers}
        showMatrix={showMatrix}
        setShowMatrix={setShowMatrix}
        currentUser={currentUser}
        darkMode={darkMode}
        ui={ui}
      />

      {/* Password Reset Confirmation Modal */}
      <AdminModal isOpen={!!crud.confirmResetId} onClose={() => crud.setConfirmResetId(null)} title="Reset Password?" tone="warning" maxWidth="450px"
        footer={
          <>
            <button type="button" onClick={() => crud.setConfirmResetId(null)} style={{ ...btnBase, background: subtleSurface, color: textSecondary }}>Cancel</button>
            <button type="button" onClick={() => { const u = users.find(u => u.id === crud.confirmResetId); if (u) crud.handleForcePasswordReset(u); crud.setConfirmResetId(null) }} disabled={!!crud.regeneratingId} style={{ ...btnBase, background: '#f59e0b', color: '#fff' }}>
              {crud.regeneratingId ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : null}
              Yes, reset password
            </button>
          </>
        }
      >
        {crud.confirmResetId && (() => {
          const u = users.find(u => u.id === crud.confirmResetId)
          return <p style={{ margin: 0 }}>Are you sure you want to forcibly reset the password for <strong style={{ color: textPrimary }}>{u?.name}</strong>? They will be securely locked out until you share the new credentials with them.</p>
        })()}
      </AdminModal>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
