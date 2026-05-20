import { useEffect, useRef, useState } from 'react'
import { buildServerNotifications } from '../adminServerNotifications'
import { ADMIN_SETTINGS_STORAGE_KEY, ADMIN_SETTINGS_UPDATED_EVENT, readAdminSettings } from '../../../utils/adminSettings'

const NOTIFICATION_LEVEL_PRIORITY = { error: 0, warning: 1, info: 2, success: 3 }

export function useNotifications(isAuthenticated) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => readAdminSettings().enableNotifications !== false)
  const [notificationOpen, setNotificationOpen] = useState(false)
  const [notificationItems, setNotificationItems] = useState([])
  const [notificationLoading, setNotificationLoading] = useState(false)
  const [notificationUpdatedAt, setNotificationUpdatedAt] = useState(null)
  const notificationRef = useRef(null)

  const syncNotificationSetting = () => setNotificationsEnabled(readAdminSettings().enableNotifications !== false)

  const loadNotifications = async ({ silent = false } = {}) => {
    const enabled = readAdminSettings().enableNotifications !== false
    if (enabled !== notificationsEnabled) setNotificationsEnabled(enabled)
    if (!enabled) {
      setNotificationItems([{ id: 'notifications-disabled', source: 'frontend', level: 'info', title: 'Notifications are disabled', detail: 'Enable Admin Notifications in Settings to receive updates.' }])
      setNotificationUpdatedAt(new Date().toISOString())
      return
    }
    if (!silent) setNotificationLoading(true)
    const server = await buildServerNotifications()
    const combined = [...server]
      .map((item) => ({ ...item, time: new Date().toISOString() }))
      .sort((a, b) => (NOTIFICATION_LEVEL_PRIORITY[a.level] ?? 9) - (NOTIFICATION_LEVEL_PRIORITY[b.level] ?? 9))
    setNotificationItems(combined)
    setNotificationUpdatedAt(new Date().toISOString())
    setNotificationLoading(false)
  }

  useEffect(() => {
    if (!isAuthenticated) return
    syncNotificationSetting()
    void loadNotifications({ silent: true })
    const intervalId = window.setInterval(() => void loadNotifications({ silent: true }), 90 * 1000)
    const handleStorage = (e) => { if (!e.key || e.key === ADMIN_SETTINGS_STORAGE_KEY) { syncNotificationSetting(); void loadNotifications({ silent: true }) } }
    const handleSettingsUpdated = () => { syncNotificationSetting(); void loadNotifications({ silent: true }) }
    const handleDocumentClick = (e) => { if (notificationRef.current && !notificationRef.current.contains(e.target)) setNotificationOpen(false) }
    const handleEscape = (e) => { if (e.key === 'Escape') setNotificationOpen(false) }
    window.addEventListener('storage', handleStorage)
    window.addEventListener(ADMIN_SETTINGS_UPDATED_EVENT, handleSettingsUpdated)
    document.addEventListener('mousedown', handleDocumentClick)
    document.addEventListener('keydown', handleEscape)
    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener(ADMIN_SETTINGS_UPDATED_EVENT, handleSettingsUpdated)
      document.removeEventListener('mousedown', handleDocumentClick)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isAuthenticated, notificationsEnabled])

  const toggleNotifications = () => {
    setNotificationOpen((prev) => {
      const next = !prev
      if (next) { syncNotificationSetting(); void loadNotifications({ silent: false }) }
      return next
    })
  }

  const issueCount = notificationItems.filter((item) => item.level === 'error' || item.level === 'warning').length

  const closeNotifications = () => setNotificationOpen(false)

  return {
    notificationsEnabled, notificationOpen, notificationItems,
    notificationLoading, notificationUpdatedAt, notificationRef,
    toggleNotifications, closeNotifications, loadNotifications, issueCount
  }
}
