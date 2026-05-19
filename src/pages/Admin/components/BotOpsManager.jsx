import { useCallback, useEffect, useState } from 'react'
import { fetchBotMessageLogs, mapBotMessageLog } from '../../../utils/botApi'
import { useAdminTheme } from '../AdminThemeContext'
import BotCsvImport from './BotCsvImport'
import BotMessageLogs from './BotMessageLogs'
import BotReminderPreviews from './BotReminderPreviews'

export default function BotOpsManager({ currentUser, hasPermission = () => false }) {
  const { darkMode } = useAdminTheme()

  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [logsError, setLogsError] = useState('')

  const canView = hasPermission('content:visitors:read') || hasPermission('admin:settings:manage') || hasPermission('*')

  const loadLogs = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLogsLoading(true)
    setLogsError('')
    try {
      const payload = await fetchBotMessageLogs({ limit: 50 })
      setLogs(Array.isArray(payload?.messages) ? payload.messages.map(mapBotMessageLog) : [])
    } catch (error) {
      setLogsError(error?.message || 'Unable to load bot message logs.')
    } finally {
      if (!silent) setLogsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!canView) return
    void loadLogs()
  }, [canView, loadLogs])

  const surface = darkMode ? '#151e2e' : '#ffffff'
  const panel = darkMode ? '#1a2235' : '#f9fafb'
  const border = darkMode ? '#2a3550' : '#dbe2ea'
  const text = darkMode ? '#e2e8f0' : '#0f172a'
  const subtext = darkMode ? '#94a3b8' : '#475569'
  const ui = { surface, panel, border, text, subtext }

  if (!canView) {
    return (
      <div style={{ padding: '2rem', borderRadius: '1rem', border: `1px solid ${border}`, background: surface }}>
        <h2 style={{ margin: '0 0 0.5rem', color: text }}>Bot Ops</h2>
        <p style={{ margin: 0, color: subtext }}>
          You do not have permission to open the bot operations screen.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <section style={{ display: 'grid', gap: '0.35rem' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', color: text }}>Bot Ops</h1>
        <p style={{ margin: 0, color: subtext }}>
          Preview Sunday and event reminders, import visitors, and review delivered messages without leaving the admin console.
        </p>
      </section>

      {logsError ? (
        <section style={{ border: '1px solid #fca5a5', borderRadius: '0.75rem', background: '#fef2f2', color: '#991b1b', padding: '0.9rem 1rem' }}>
          {logsError}
        </section>
      ) : null}

      <BotMessageLogs
        logs={logs}
        loading={logsLoading}
        onRefresh={loadLogs}
        darkMode={darkMode}
        ui={ui}
      />

      <BotReminderPreviews darkMode={darkMode} ui={ui} />

      <BotCsvImport darkMode={darkMode} ui={ui} />
    </div>
  )
}
