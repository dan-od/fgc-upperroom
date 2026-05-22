import { useRef, useEffect } from 'react'
import {
  CheckCircle,
  Copy,
  Edit2,
  Key,
  Loader2,
  Trash2,
  UserCheck,
  UserX
} from 'lucide-react'
import { DropdownSelect, useFeedback } from '../../../components/common'
import { ROLE_META } from '../../../utils/adminConstants'
import { RoleBadge } from './PermissionMatrix'
import PermissionMatrix from './PermissionMatrix'

export const PasswordStrengthBar = ({ password, textSecondary }) => {
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
        <div key={i} style={{ flex: 1, height: '4px', borderRadius: '9999px', background: i <= score ? colors[score - 1] : '#e5e7eb', transition: 'background 0.2s' }} />
      ))}
      <span style={{ fontSize: '0.7rem', color: score > 0 ? colors[score - 1] : textSecondary, minWidth: '5rem' }}>
        {score > 0 ? labels[score - 1] : ''}
      </span>
    </div>
  )
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

export default function UserList({
  users,
  loading,
  handlers,
  regeneratedPasswords,
  passwordTimers,
  showMatrix,
  setShowMatrix,
  currentUser,
  darkMode,
  ui
}) {
  const { showSuccess, showError } = useFeedback()
  const {
    savingId, confirmDeleteId, setConfirmDeleteId,
    regeneratingId,
    editingNameId, setEditingNameId,
    editingNameValue, setEditingNameValue,
    handleRoleChange, handleToggleActive, handleDelete,
    handleSaveName, isSuperAdmin
  } = handlers

  const editInputRef = useRef(null)
  useEffect(() => {
    if (editingNameId && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [editingNameId])

  const { panelBg, panelBorder, inputBg, textPrimary, textSecondary, subtleSurface, btnBase, inputStyle } = ui

  return (
    <>
      {loading ? (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '2rem', color: textSecondary }}>
          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite' }} />
          Loading admin users…
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {users.map((user) => {
            const isSelf = user.id === currentUser?.id
            const isDeleting = confirmDeleteId === user.id
            const isSaving = savingId === user.id
            const meta = ROLE_META[user.role] || ROLE_META.editor
            const initial = (user.name || 'A')[0].toUpperCase()
            return (
              <div key={user.id} style={{ background: panelBg, border: `1px solid ${panelBorder}`, borderRadius: '0.75rem', padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', opacity: !user.isActive ? 0.65 : 1, transition: 'opacity 0.2s' }}>
                {/* Avatar */}
                <div style={{ width: '42px', height: '42px', borderRadius: '50%', background: `linear-gradient(135deg, ${darkMode ? meta.darkBg : meta.bg}, ${darkMode ? meta.darkColor + '44' : meta.color + '22'})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem', color: darkMode ? meta.darkColor : meta.color, flexShrink: 0, border: `2px solid ${darkMode ? meta.darkColor + '40' : meta.color + '30'}` }}>
                  {initial}
                </div>
                {/* Info */}
                <div style={{ flex: 1, minWidth: '0' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {editingNameId === user.id ? (
                      <form onSubmit={(e) => { e.preventDefault(); handleSaveName(user, editingNameValue, setEditingNameId) }} style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                        <input ref={editInputRef} value={editingNameValue} onChange={e => setEditingNameValue(e.target.value)} style={{ ...inputStyle, padding: '0.2rem 0.5rem', width: '150px', fontSize: '0.9rem' }} disabled={isSaving} />
                        <button type="submit" disabled={isSaving} style={{ ...btnBase, padding: '0.2rem 0.5rem', background: '#16a34a', color: '#fff', fontSize: '0.8rem' }}>Save</button>
                        <button type="button" onClick={() => setEditingNameId(null)} disabled={isSaving} style={{ ...btnBase, padding: '0.2rem 0.5rem', background: subtleSurface, color: textSecondary, fontSize: '0.8rem' }}>Cancel</button>
                      </form>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.95rem', color: textPrimary }}>{user.name}</span>
                        {(isSuperAdmin || isSelf) && (
                          <button type="button" onClick={() => { setEditingNameId(user.id); setEditingNameValue(user.name) }} title="Edit name" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: textSecondary, padding: '0.2rem', display: 'flex', alignItems: 'center' }} disabled={isSaving}>
                            <Edit2 size={13} />
                          </button>
                        )}
                      </div>
                    )}
                    {isSelf && <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '9999px', background: '#5a449420', color: '#5a4494', textTransform: 'uppercase', letterSpacing: '0.04em' }}>You</span>}
                    <RoleBadge role={user.role} darkMode={darkMode} />
                    {!user.isActive && <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '0.15rem 0.45rem', borderRadius: '9999px', background: '#fef2f2', color: '#991b1b', textTransform: 'uppercase' }}>Inactive</span>}
                  </div>
                  <p style={{ margin: '0.2rem 0 0', fontSize: '0.8rem', color: textSecondary }}>{user.email}</p>
                  <p style={{ margin: '0.1rem 0 0', fontSize: '0.73rem', color: textSecondary }}>
                    Last login: {formatRelative(user.lastLoginAt)} &nbsp;·&nbsp; Created {formatRelative(user.createdAt)}
                    {user.twoFactorEnabled && <span style={{ marginLeft: '0.4rem', color: '#16a34a', fontWeight: 600 }}>· 2FA on</span>}
                  </p>
                </div>
                {/* Actions */}
                {isSuperAdmin && !isSelf && (
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <DropdownSelect value={user.role} onChange={(e) => handleRoleChange(user, e.target.value)} disabled={isSaving} style={{ ...inputStyle, width: 'auto', padding: '0.4rem 0.65rem', fontSize: '0.8rem', cursor: 'pointer' }} title="Change role">
                      <option value="editor">Editor</option>
                      <option value="reviewer">Reviewer</option>
                      <option value="super_admin">Super Admin</option>
                    </DropdownSelect>
                    <button type="button" onClick={() => handleToggleActive(user)} disabled={isSaving} title={user.isActive ? 'Deactivate user' : 'Activate user'} style={{ ...btnBase, padding: '0.45rem 0.75rem', background: user.isActive ? (darkMode ? '#083127' : '#ecfdf5') : subtleSurface, color: user.isActive ? '#16a34a' : textSecondary, border: `1px solid ${user.isActive ? '#6ee7b7' : panelBorder}` }}>
                      {isSaving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : user.isActive ? <UserCheck size={14} /> : <UserX size={14} />}
                      {user.isActive ? 'Active' : 'Inactive'}
                    </button>
                    <button type="button" onClick={() => handlers.setConfirmResetId(user.id)} disabled={isSaving || regeneratingId === user.id} title="Force password reset" style={{ ...btnBase, padding: '0.45rem 0.65rem', background: 'transparent', color: textSecondary, border: `1px solid ${panelBorder}` }}>
                      {regeneratingId === user.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Key size={14} />}
                      Reset Password
                    </button>
                    {isDeleting ? (
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.78rem', color: '#991b1b', fontWeight: 600 }}>Confirm delete?</span>
                        <button type="button" onClick={() => handleDelete(user, currentUser?.id)} style={{ ...btnBase, padding: '0.4rem 0.65rem', background: '#ef4444', color: '#fff', fontSize: '0.8rem' }}>Yes, delete</button>
                        <button type="button" onClick={() => setConfirmDeleteId(null)} style={{ ...btnBase, padding: '0.4rem 0.65rem', background: subtleSurface, color: textSecondary, fontSize: '0.8rem' }}>Cancel</button>
                      </div>
                    ) : (
                      <button type="button" onClick={() => setConfirmDeleteId(user.id)} disabled={isSaving} title="Delete admin user" style={{ ...btnBase, padding: '0.45rem 0.65rem', background: 'transparent', color: '#ef4444', border: '1px solid #fecaca' }}>
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
                {/* Regenerated Password Banner */}
                {regeneratedPasswords[user.id] && (
                  <div style={{ width: '100%', marginTop: '0.5rem', padding: '0.75rem', background: darkMode ? '#083127' : '#ecfdf5', border: `1px solid ${darkMode ? '#065f46' : '#6ee7b7'}`, borderRadius: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: darkMode ? '#6ee7b7' : '#065f46' }}>
                        New Password for {user.name} ({passwordTimers[user.id] || 0}s remaining)
                      </span>
                      <code style={{ fontSize: '1.05rem', fontWeight: 700, color: darkMode ? '#e2e8f0' : '#064e3b', background: 'transparent', padding: 0 }}>
                        {regeneratedPasswords[user.id]}
                      </code>
                    </div>
                    <button type="button" onClick={async () => { try { await window.navigator.clipboard.writeText(regeneratedPasswords[user.id]); showSuccess('Password copied to clipboard.', { title: 'Copied' }) } catch { showError('Unable to copy the password right now.', { title: 'Copy failed' }) } }} style={{ ...btnBase, background: '#10b981', color: '#fff', padding: '0.35rem 0.65rem' }}>
                      <Copy size={13} /> Copy
                    </button>
                  </div>
                )}
                {isSaving && <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: textSecondary, flexShrink: 0 }} />}
              </div>
            )
          })}
          {users.length === 0 && (
            <div style={{ padding: '2rem', textAlign: 'center', color: textSecondary, background: panelBg, borderRadius: '0.75rem', border: `1px dashed ${panelBorder}` }}>
              No admin users match your current filters.
            </div>
          )}
        </div>
      )}

      <PermissionMatrix showMatrix={showMatrix} setShowMatrix={setShowMatrix} darkMode={darkMode} ui={ui} />
    </>
  )
}
