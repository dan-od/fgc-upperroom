import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Copy,
  Edit2,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserCheck,
  UserCog,
  UserX,
  X
} from 'lucide-react'
import { useAdminTheme } from '../AdminThemeContext'
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUser
} from '../../../utils/adminApi'
import { DropdownSelect, useFeedback } from '../../../components/common'
import { ADMIN_DATE_FILTER_OPTIONS, matchesAdminDateFilter } from '../../../utils/adminDateFilters'
import AdminModal from './AdminModal'

const ROLE_META = {
  super_admin: {
    label: 'Super Admin',
    color: '#7c3aed',
    bg: '#ede9fe',
    darkBg: '#2d1f5e',
    darkColor: '#c4b5fd'
  },
  editor: {
    label: 'Editor',
    color: '#0369a1',
    bg: '#e0f2fe',
    darkBg: '#0c2f4a',
    darkColor: '#7dd3fc'
  },
  reviewer: {
    label: 'Reviewer',
    color: '#065f46',
    bg: '#d1fae5',
    darkBg: '#083127',
    darkColor: '#6ee7b7'
  }
}

const PERMISSION_MATRIX = [
  { label: 'Manage admin users', super_admin: true, editor: false, reviewer: false },
  { label: 'View audit logs', super_admin: true, editor: false, reviewer: true },
  { label: 'Create / edit events', super_admin: true, editor: true, reviewer: false },
  { label: 'Publish events', super_admin: true, editor: false, reviewer: false },
  { label: 'Create / edit blog posts', super_admin: true, editor: true, reviewer: false },
  { label: 'Publish blog posts', super_admin: true, editor: false, reviewer: false },
  { label: 'Approve content', super_admin: true, editor: false, reviewer: true },
  { label: 'Upload / manage media', super_admin: true, editor: true, reviewer: false },
  { label: 'View media', super_admin: true, editor: true, reviewer: true },
  { label: 'View analytics', super_admin: true, editor: false, reviewer: false },
  { label: 'View giving transactions', super_admin: true, editor: false, reviewer: false }
]

const PasswordStrengthBar = ({ password, textSecondary }) => {
  if (!password) return null
  let score = 0
  if (password.length >= 10) score++
  if (/[a-z]/.test(password)) score++
  if (/[A-Z]/.test(password)) score++
  if (/\d/.test(password)) score++
  if (/[^a-zA-Z0-9]/.test(password)) score++

  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#16a34a']
  const labels = ['Very weak', 'Weak', 'Fair', 'Strong', 'Very strong']
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: '4px',
            borderRadius: '9999px',
            background: i <= score ? colors[score - 1] : '#e5e7eb',
            transition: 'background 0.2s'
          }}
        />
      ))}
      <span style={{ fontSize: '0.7rem', color: score > 0 ? colors[score - 1] : textSecondary, minWidth: '5rem' }}>
        {score > 0 ? labels[score - 1] : ''}
      </span>
    </div>
  )
}

const RoleBadge = ({ role, darkMode }) => {
  const meta = ROLE_META[role] || ROLE_META.editor
  return (
    <span style={{
      fontSize: '0.7rem',
      fontWeight: 700,
      letterSpacing: '0.03em',
      textTransform: 'uppercase',
      padding: '0.2rem 0.55rem',
      borderRadius: '9999px',
      background: darkMode ? meta.darkBg : meta.bg,
      color: darkMode ? meta.darkColor : meta.color,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '0.25rem'
    }}>
      {meta.label}
    </span>
  )
}

const AdminUsers = ({ currentUser, hasPermission = () => false }) => {
  const { showError, showSuccess } = useFeedback()
  const { darkMode } = useAdminTheme()
  const isSuperAdmin = hasPermission('admin:users:manage')

  const panelBg = darkMode ? '#1a2235' : '#ffffff'
  const panelBorder = darkMode ? '#2a3550' : '#e5e7eb'
  const inputBg = darkMode ? '#131b2e' : '#ffffff'
  const textPrimary = darkMode ? '#e2e8f0' : '#111827'
  const textSecondary = darkMode ? '#7f93b3' : '#6b7280'
  const subtleSurface = darkMode ? '#222c40' : '#f9fafb'
  const cardHoverBg = darkMode ? '#1e2d44' : '#f0f4ff'

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusMsg, setStatusMsg] = useState({ tone: '', message: '' })
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [showMatrix, setShowMatrix] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterDate, setFilterDate] = useState('all')
  const [savingId, setSavingId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [confirmResetId, setConfirmResetId] = useState(null)
  const [regeneratingId, setRegeneratingId] = useState(null)
  const [editingNameId, setEditingNameId] = useState(null)
  const [editingNameValue, setEditingNameValue] = useState('')
  const [regeneratedPasswords, setRegeneratedPasswords] = useState({})
  const [newForm, setNewForm] = useState({
    name: '', email: '', role: 'editor', password: ''
  })
  const [creatingUser, setCreatingUser] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [passwordTimers, setPasswordTimers] = useState({})
  const editInputRef = useRef(null)

  useEffect(() => {
    if (editingNameId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingNameId])

  useEffect(() => {
    const timer = setInterval(() => {
      setPasswordTimers(prev => {
        const next = { ...prev }
        let changed = false
        Object.keys(next).forEach(id => {
          if (next[id] > 1) {
            next[id] -= 1
            changed = true
          } else {
            delete next[id]
            setRegeneratedPasswords(p => {
              const n = { ...p }
              delete n[id]
              return n
            })
            changed = true
          }
        })
        return changed ? next : prev
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [])

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
      const matchesSearch = !term
        || String(user.name || '').toLowerCase().includes(term)
        || String(user.email || '').toLowerCase().includes(term)
        || String(user.role || '').toLowerCase().includes(term)

      const matchesDate = matchesAdminDateFilter(user.createdAt || user.updatedAt || user.lastLoginAt, filterDate)
      return matchesSearch && matchesDate
    })
  }, [filterDate, searchTerm, users])

  const showStatus = (tone, message, durationMs = 4000) => {
    setStatusMsg({ tone, message })
    if (durationMs > 0) setTimeout(() => setStatusMsg({ tone: '', message: '' }), durationMs)
  }

  const handleRoleChange = async (user, role) => {
    if (!isSuperAdmin || role === user.role) return
    setSavingId(user.id)
    try {
      await updateAdminUser(user.id, { role })
      await load()
      showStatus('success', `Role updated to ${ROLE_META[role]?.label || role}.`)
    } catch (err) {
      showStatus('error', err?.message || 'Failed to update role.')
    } finally {
      setSavingId(null)
    }
  }

  const handleToggleActive = async (user) => {
    if (!isSuperAdmin) return
    const next = !user.isActive
    setSavingId(user.id)
    try {
      await updateAdminUser(user.id, { isActive: next })
      await load()
      showStatus('success', `${user.name} is now ${next ? 'active' : 'deactivated'}.`)
    } catch (err) {
      showStatus('error', err?.message || 'Failed to update status.')
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (user) => {
    if (!isSuperAdmin || user.id === currentUser?.id) return
    setSavingId(user.id)
    setConfirmDeleteId(null)
    try {
      await deleteAdminUser(user.id)
      await load()
      showStatus('success', `${user.name} has been removed.`)
    } catch (err) {
      showStatus('error', err?.message || 'Failed to delete user.')
    } finally {
      setSavingId(null)
    }
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    const { name, email, role, password } = newForm
    if (!name.trim() || !email.trim() || !password.trim()) {
      showStatus('error', 'Name, email, and password are all required.')
      return
    }
    setCreatingUser(true)
    try {
      const result = await createAdminUser({ name: name.trim(), email: email.trim(), role, password: password.trim() })
      await load()
      
      const newUser = result?.user
      if (newUser?.id) {
        setRegeneratedPasswords(prev => ({ ...prev, [newUser.id]: password.trim() }))
        setPasswordTimers(prev => ({ ...prev, [newUser.id]: 30 }))
      }

      setNewForm({ name: '', email: '', role: 'editor', password: '' })
      setShowCreateForm(false)
      showStatus('success', `${name.trim()} has been added as ${ROLE_META[role]?.label || role}.`)
    } catch (err) {
      showStatus('error', err?.message || 'Failed to create admin user.')
    } finally {
      setCreatingUser(false)
    }
  }

  const createRandomPassword = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?'
    let pass = ''
    pass += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
    pass += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
    pass += '0123456789'[Math.floor(Math.random() * 10)]
    pass += '!@#$%^&*'[Math.floor(Math.random() * 8)]
    for (let i = 0; i < 12; i++) {
      pass += chars[Math.floor(Math.random() * chars.length)]
    }
    return pass.split('').sort(() => 0.5 - Math.random()).join('')
  }

  const generatePassword = () => {
    setNewForm((p) => ({ ...p, password: createRandomPassword() }))
  }

  const handleForcePasswordReset = async (user) => {
    if (!isSuperAdmin) return

    const newPass = createRandomPassword()
    setRegeneratingId(user.id)
    try {
      await updateAdminUser(user.id, { password: newPass })
      setRegeneratedPasswords((prev) => ({ ...prev, [user.id]: newPass }))
      setPasswordTimers(prev => ({ ...prev, [user.id]: 30 }))
      showStatus('success', `Password for ${user.name} has been reset.`)
    } catch (err) {
      showStatus('error', err?.message || 'Failed to reset password.')
    } finally {
      setRegeneratingId(null)
    }
  }

  const handleSaveName = async (user) => {
    if (!editingNameValue.trim() || editingNameValue.trim() === user.name) {
      setEditingNameId(null)
      return
    }
    setSavingId(user.id)
    try {
      await updateAdminUser(user.id, { name: editingNameValue.trim() })
      await load()
      showStatus('success', 'Name updated successfully.')
      setEditingNameId(null)
    } catch (err) {
      showStatus('error', err?.message || 'Failed to update name.')
    } finally {
      setSavingId(null)
    }
  }

  const formatRelative = (isoString) => {
    if (!isoString) return 'Never'
    const delta = Date.now() - new Date(isoString).getTime()
    const s = Math.floor(delta / 1000)
    if (s < 60) return 'Just now'
    const m = Math.floor(s / 60)
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    const d = Math.floor(h / 24)
    if (d < 7) return `${d}d ago`
    return new Date(isoString).toLocaleDateString()
  }

  const inputStyle = {
    padding: '0.65rem 0.75rem',
    border: `1px solid ${panelBorder}`,
    borderRadius: '0.5rem',
    fontSize: '0.925rem',
    background: inputBg,
    color: textPrimary,
    width: '100%',
    boxSizing: 'border-box'
  }

  const btnBase = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.4rem',
    padding: '0.55rem 1rem',
    borderRadius: '0.5rem',
    fontSize: '0.875rem',
    fontWeight: 600,
    border: 'none',
    cursor: 'pointer',
    transition: 'opacity 0.15s'
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: textPrimary }}>
            Admin Users
          </h2>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.875rem', color: textSecondary }}>
            {loading ? 'Loading…' : `${filteredUsers.length} admin account${filteredUsers.length !== 1 ? 's' : ''} shown`}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={load}
            style={{ ...btnBase, background: subtleSurface, color: textSecondary }}
            disabled={loading}
          >
            <RefreshCw size={15} style={{ animation: loading ? 'spin 1s linear infinite' : 'none' }} />
            Refresh
          </button>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => setShowCreateForm((v) => !v)}
              style={{ ...btnBase, background: '#5a4494', color: '#fff' }}
            >
              {showCreateForm ? <X size={15} /> : <Plus size={15} />}
              {showCreateForm ? 'Cancel' : 'Add Admin'}
            </button>
          )}
        </div>
      </div>

      {/* Status message */}
      {statusMsg.message && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.75rem 1rem',
          borderRadius: '0.5rem',
          background: statusMsg.tone === 'success' ? (darkMode ? '#083127' : '#ecfdf5') : (darkMode ? '#3b0c0c' : '#fef2f2'),
          border: `1px solid ${statusMsg.tone === 'success' ? '#6ee7b7' : '#fecaca'}`,
          color: statusMsg.tone === 'success' ? (darkMode ? '#6ee7b7' : '#065f46') : (darkMode ? '#fca5a5' : '#991b1b'),
          fontSize: '0.875rem'
        }}>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(240px, 1fr) 220px', gap: '0.75rem' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0 0.75rem', border: `1px solid ${panelBorder}`, borderRadius: '0.65rem', background: inputBg }}>
          <Search size={16} style={{ color: textSecondary }} />
          <input
            type="text"
            placeholder="Search admin users..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            style={{ border: 'none', outline: 'none', background: 'transparent', color: textPrimary, width: '100%', padding: '0.75rem 0' }}
          />
        </label>
        <DropdownSelect value={filterDate} onChange={(event) => setFilterDate(event.target.value)} style={inputStyle}>
          {ADMIN_DATE_FILTER_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </DropdownSelect>
      </div>

      {/* Add Admin Modal */}
      <AdminModal
        isOpen={showCreateForm}
        onClose={() => setShowCreateForm(false)}
        title="Add New Admin"
        tone="info"
        maxWidth="600px"
        footer={
          <>
            <button type="button" onClick={() => setShowCreateForm(false)} style={{ ...btnBase, background: subtleSurface, color: textSecondary }}>
              Cancel
            </button>
            <button 
              type="button" 
              onClick={(e) => handleCreateUser(e)} 
              disabled={creatingUser} 
              style={{ ...btnBase, background: '#5a4494', color: '#fff', opacity: creatingUser ? 0.7 : 1 }}
            >
              {creatingUser ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={15} />}
              {creatingUser ? 'Creating…' : 'Create Admin'}
            </button>
          </>
        }
      >
        <form onSubmit={handleCreateUser} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: textSecondary }}>Full Name</span>
            <input
              type="text"
              placeholder="e.g. Favour Okafor"
              value={newForm.name}
              onChange={(e) => setNewForm((p) => ({ ...p, name: e.target.value }))}
              style={inputStyle}
              required
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: textSecondary }}>Email Address</span>
            <input
              type="email"
              placeholder="name@upperroom.local"
              value={newForm.email}
              onChange={(e) => setNewForm((p) => ({ ...p, email: e.target.value }))}
              style={inputStyle}
              required
            />
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: textSecondary }}>Role</span>
            <DropdownSelect
              value={newForm.role}
              onChange={(e) => setNewForm((p) => ({ ...p, role: e.target.value }))}
              style={inputStyle}
            >
              <option value="editor">Editor — content creation</option>
              <option value="reviewer">Reviewer — content approval</option>
              <option value="super_admin">Super Admin — full access</option>
            </DropdownSelect>
          </label>
          <label style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: textSecondary }}>Initial Password</span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'transparent', border: 'none', color: textSecondary, cursor: 'pointer', padding: '0.2rem' }}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
                <button
                  type="button"
                  onClick={generatePassword}
                  title="Generate strong password"
                  style={{
                    padding: '0.2rem 0.5rem', fontSize: '0.7rem', fontWeight: 600,
                    background: subtleSurface, color: '#5a4494', border: `1px solid ${panelBorder}`,
                    borderRadius: '0.35rem', cursor: 'pointer'
                  }}
                >
                  Generate
                </button>
              </div>
            </div>
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Min 10 chars, upper, lower, number"
              value={newForm.password}
              onChange={(e) => setNewForm((p) => ({ ...p, password: e.target.value }))}
              style={inputStyle}
              required
            />
            <PasswordStrengthBar password={newForm.password} textSecondary={textSecondary} />
          </label>
        </form>
      </AdminModal>

      {/* User Cards */}
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '2rem', color: textSecondary }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          Loading admin users…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {filteredUsers.map((user) => {
            const isSelf = user.id === currentUser?.id
            const isDeleting = confirmDeleteId === user.id
            const isSaving = savingId === user.id
            const meta = ROLE_META[user.role] || ROLE_META.editor
            const initial = (user.name || 'A')[0].toUpperCase()

            return (
              <div
                key={user.id}
                style={{
                  background: panelBg,
                  border: `1px solid ${panelBorder}`,
                  borderRadius: '0.75rem',
                  padding: '1rem 1.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '1rem',
                  flexWrap: 'wrap',
                  opacity: !user.isActive ? 0.65 : 1,
                  transition: 'opacity 0.2s'
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: '42px', height: '42px', borderRadius: '50%',
                  background: `linear-gradient(135deg, ${darkMode ? meta.darkBg : meta.bg}, ${darkMode ? meta.darkColor + '44' : meta.color + '22'})`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: '1rem', color: darkMode ? meta.darkColor : meta.color,
                  flexShrink: 0, border: `2px solid ${darkMode ? meta.darkColor + '40' : meta.color + '30'}`
                }}>
                  {initial}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {editingNameId === user.id ? (
                      <form onSubmit={(e) => { e.preventDefault(); handleSaveName(user); }} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <input
                           ref={editInputRef}
                           value={editingNameValue}
                           onChange={e => setEditingNameValue(e.target.value)}
                           style={{ ...inputStyle, padding: '0.2rem 0.5rem', width: '150px', fontSize: '0.9rem' }}
                           disabled={isSaving}
                        />
                        <button type="submit" disabled={isSaving} style={{ ...btnBase, padding: '0.2rem 0.5rem', background: '#16a34a', color: '#fff', fontSize: '0.8rem' }}>Save</button>
                        <button type="button" onClick={() => setEditingNameId(null)} disabled={isSaving} style={{ ...btnBase, padding: '0.2rem 0.5rem', background: subtleSurface, color: textSecondary, fontSize: '0.8rem' }}>Cancel</button>
                      </form>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: textPrimary }}>{user.name}</span>
                        {(isSuperAdmin || isSelf) && (
                          <button
                            type="button"
                            onClick={() => { setEditingNameId(user.id); setEditingNameValue(user.name); }}
                            title="Edit name"
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: textSecondary, padding: '0.2rem', display: 'flex', alignItems: 'center' }}
                            disabled={isSaving}
                          >
                            <Edit2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                    {isSelf && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '9999px', background: '#5a449420', color: '#5a4494', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        You
                      </span>
                    )}
                    <RoleBadge role={user.role} darkMode={darkMode} />
                    {!user.isActive && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '9999px', background: '#fef2f2', color: '#991b1b', textTransform: 'uppercase' }}>
                        Inactive
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: textSecondary }}>{user.email}</p>
                  <p style={{ margin: '0.1rem 0 0', fontSize: '0.73rem', color: textSecondary }}>
                    Last login: {formatRelative(user.lastLoginAt)} &nbsp;·&nbsp; Created {formatRelative(user.createdAt)}
                    {user.twoFactorEnabled && (
                      <span style={{ marginLeft: '0.4rem', color: '#16a34a', fontWeight: 600 }}>· 2FA on</span>
                    )}
                  </p>
                </div>

                {/* Actions */}
                {isSuperAdmin && !isSelf && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <DropdownSelect
                      value={user.role}
                      onChange={(e) => handleRoleChange(user, e.target.value)}
                      disabled={isSaving}
                      style={{
                        ...inputStyle, width: 'auto', padding: '0.4rem 0.65rem',
                        fontSize: '0.8rem', cursor: 'pointer'
                      }}
                      title="Change role"
                    >
                      <option value="editor">Editor</option>
                      <option value="reviewer">Reviewer</option>
                      <option value="super_admin">Super Admin</option>
                    </DropdownSelect>

                    <button
                      type="button"
                      onClick={() => handleToggleActive(user)}
                      disabled={isSaving}
                      title={user.isActive ? 'Deactivate user' : 'Activate user'}
                      style={{
                        ...btnBase, padding: '0.45rem 0.75rem',
                        background: user.isActive ? (darkMode ? '#083127' : '#ecfdf5') : subtleSurface,
                        color: user.isActive ? '#16a34a' : textSecondary,
                        border: `1px solid ${user.isActive ? '#6ee7b7' : panelBorder}`
                      }}
                    >
                      {isSaving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : user.isActive ? <UserCheck size={14} /> : <UserX size={14} />}
                      {user.isActive ? 'Active' : 'Inactive'}
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmResetId(user.id)}
                      disabled={isSaving || regeneratingId === user.id}
                      title="Force password reset"
                      style={{
                        ...btnBase, padding: '0.45rem 0.65rem',
                        background: 'transparent',
                        color: textSecondary,
                        border: `1px solid ${panelBorder}`
                      }}
                    >
                      {regeneratingId === user.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Key size={14} />}
                      Reset Password
                    </button>

                    {isDeleting ? (
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: 600 }}>Confirm delete?</span>
                        <button
                          type="button"
                          onClick={() => handleDelete(user)}
                          style={{ ...btnBase, padding: '0.4rem 0.65rem', background: '#ef4444', color: '#fff', fontSize: '0.8rem' }}
                        >
                          Yes, delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          style={{ ...btnBase, padding: '0.4rem 0.65rem', background: subtleSurface, color: textSecondary, fontSize: '0.8rem' }}
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(user.id)}
                        disabled={isSaving}
                        title="Delete admin user"
                        style={{ ...btnBase, padding: '0.45rem 0.65rem', background: 'transparent', color: '#ef4444', border: '1px solid #fecaca' }}
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}

                {/* Regenerated Password Banner */}
                {regeneratedPasswords[user.id] && (
                  <div style={{
                    width: '100%', marginTop: '0.5rem', padding: '0.75rem',
                    background: darkMode ? '#083127' : '#ecfdf5',
                    border: `1px solid ${darkMode ? '#065f46' : '#6ee7b7'}`,
                    borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: darkMode ? '#6ee7b7' : '#065f46' }}>
                        New Password for {user.name} ({passwordTimers[user.id] || 0}s remaining)
                      </span>
                      <code style={{ fontSize: '1.05rem', fontWeight: 700, color: darkMode ? '#e2e8f0' : '#064e3b', background: 'transparent', padding: 0 }}>
                        {regeneratedPasswords[user.id]}
                      </code>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await window.navigator.clipboard.writeText(regeneratedPasswords[user.id])
                          showSuccess('Password copied to clipboard.', { title: 'Copied' })
                        } catch {
                          showError('Unable to copy the password right now.', { title: 'Copy failed' })
                        }
                      }}
                      style={{ ...btnBase, background: '#10b981', color: '#fff', padding: '0.35rem 0.65rem' }}
                    >
                      <Copy size={13} /> Copy
                    </button>
                  </div>
                )}

                {isSaving && (
                  <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: textSecondary, flexShrink: 0 }} />
                )}
              </div>
            )
          })}
          {filteredUsers.length === 0 && !loading && (
            <div style={{ padding: '2rem', textAlign: 'center', color: textSecondary, background: panelBg, borderRadius: '0.75rem', border: `1px dashed ${panelBorder}` }}>
              No admin users match your current filters.
            </div>
          )}
        </div>
      )}

      {/* Role Permission Matrix */}
      <div style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: '0.75rem', overflow: 'hidden' }}>
        <button
          type="button"
          onClick={() => setShowMatrix((v) => !v)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0.9rem 1.25rem', background: 'transparent', border: 'none',
            cursor: 'pointer', color: textPrimary, fontWeight: 700, fontSize: '0.925rem'
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Shield size={16} style={{ color: '#5a4494' }} /> Role Permission Matrix
          </span>
          {showMatrix ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showMatrix && (
          <div style={{ overflowX: 'auto', borderTop: `1px solid ${panelBorder}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.825rem' }}>
              <thead>
                <tr style={{ background: subtleSurface }}>
                  <th style={{ padding: '0.65rem 1rem', textAlign: 'left', color: textSecondary, fontWeight: 600, borderBottom: `1px solid ${panelBorder}` }}>
                    S/N
                  </th>
                  <th style={{ padding: '0.65rem 1.25rem', textAlign: 'left', color: textSecondary, fontWeight: 600, borderBottom: `1px solid ${panelBorder}` }}>
                    Permission
                  </th>
                  {['super_admin', 'editor', 'reviewer'].map((role) => (
                    <th key={role} style={{ padding: '0.65rem 1rem', textAlign: 'center', borderBottom: `1px solid ${panelBorder}` }}>
                      <RoleBadge role={role} darkMode={darkMode} />
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PERMISSION_MATRIX.map((row, idx) => (
                  <tr key={row.label} style={{ background: idx % 2 === 0 ? 'transparent' : subtleSurface }}>
                    <td style={{ padding: '0.55rem 1rem', color: textSecondary, borderBottom: `1px solid ${panelBorder}`, fontWeight: 700 }}>
                      {idx + 1}
                    </td>
                    <td style={{ padding: '0.55rem 1.25rem', color: textPrimary, borderBottom: `1px solid ${panelBorder}` }}>
                      {row.label}
                    </td>
                    {['super_admin', 'editor', 'reviewer'].map((role) => (
                      <td key={role} style={{ padding: '0.55rem 1rem', textAlign: 'center', borderBottom: `1px solid ${panelBorder}` }}>
                        {row[role] ? (
                          <span style={{ color: '#16a34a', fontWeight: 700, fontSize: '0.95rem' }}>✓</span>
                        ) : (
                          <span style={{ color: panelBorder, fontSize: '0.85rem' }}>—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Password Reset Confirmation */}
      <AdminModal
        isOpen={!!confirmResetId}
        onClose={() => setConfirmResetId(null)}
        title="Reset Password?"
        tone="warning"
        maxWidth="450px"
        footer={
          <>
            <button type="button" onClick={() => setConfirmResetId(null)} style={{ ...btnBase, background: subtleSurface, color: textSecondary }}>
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                const userToReset = users.find(u => u.id === confirmResetId);
                if (userToReset) handleForcePasswordReset(userToReset);
                setConfirmResetId(null);
              }}
              disabled={regeneratingId}
              style={{ ...btnBase, background: '#f59e0b', color: '#fff' }}
            >
              {regeneratingId ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Key size={15} />}
              Yes, reset password
            </button>
          </>
        }
      >
        {confirmResetId && (() => {
          const userToReset = users.find(u => u.id === confirmResetId);
          return (
            <p style={{ margin: 0 }}>
              Are you sure you want to forcibly reset the password for <strong style={{ color: textPrimary }}>{userToReset?.name}</strong>?
              They will be securely locked out until you share the new credentials with them.
            </p>
          );
        })()}
      </AdminModal>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}

export default AdminUsers
