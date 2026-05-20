import { useEffect, useState } from 'react'
import {
  createAdminUser,
  deleteAdminUser,
  fetchAdminUsers,
  updateAdminUser
} from '../../../utils/adminApi'
import { ROLE_META } from '../../../utils/adminConstants'

export function useUsersCrud({ showStatus, setUsers, load }) {
  const [savingId, setSavingId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [confirmResetId, setConfirmResetId] = useState(null)
  const [regeneratingId, setRegeneratingId] = useState(null)
  const [regeneratedPasswords, setRegeneratedPasswords] = useState({})
  const [passwordTimers, setPasswordTimers] = useState({})

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

  const generatePassword = (setNewForm) => {
    setNewForm(p => ({ ...p, password: createRandomPassword() }))
  }

  const handleRoleChange = async (user, role) => {
    if (role === user.role) return
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

  const handleDelete = async (user, currentUserId) => {
    if (user.id === currentUserId) return
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

  const handleCreateUser = async ({ newForm, setNewForm, setShowCreateForm, setCreatingUser }) => {
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

  const handleForcePasswordReset = async (user) => {
    const newPass = createRandomPassword()
    setRegeneratingId(user.id)
    try {
      await updateAdminUser(user.id, { password: newPass })
      setRegeneratedPasswords(prev => ({ ...prev, [user.id]: newPass }))
      setPasswordTimers(prev => ({ ...prev, [user.id]: 30 }))
      showStatus('success', `Password for ${user.name} has been reset.`)
    } catch (err) {
      showStatus('error', err?.message || 'Failed to reset password.')
    } finally {
      setRegeneratingId(null)
    }
  }

  const handleSaveName = async (user, editingNameValue, setEditingNameId) => {
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

  return {
    savingId,
    confirmDeleteId,
    setConfirmDeleteId,
    confirmResetId,
    setConfirmResetId,
    regeneratingId,
    regeneratedPasswords,
    passwordTimers,
    createRandomPassword,
    generatePassword,
    handleRoleChange,
    handleToggleActive,
    handleDelete,
    handleCreateUser,
    handleForcePasswordReset,
    handleSaveName
  }
}
