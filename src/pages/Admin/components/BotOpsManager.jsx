import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  FileUp,
  MessageSquare,
  RefreshCw,
  Search,
  Send,
  Upload,
  XCircle
} from 'lucide-react'
import { DropdownSelect } from '../../../components/common'
import {
  fetchBotMessageLogs,
  importBotVisitorsCsv,
  mapBotMessageLog,
  previewBotEventReminder,
  previewBotServiceReminder
} from '../../../utils/botApi'
import { useAdminTheme } from '../AdminThemeContext'

const todayIso = () => new Date().toISOString().slice(0, 10)

const statusTone = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'sent' || normalized === 'delivered' || normalized === 'read') {
    return { color: '#166534', background: '#dcfce7', border: '#86efac', icon: CheckCircle2, label: normalized }
  }
  if (normalized === 'failed') {
    return { color: '#991b1b', background: '#fee2e2', border: '#fca5a5', icon: XCircle, label: normalized }
  }
  if (normalized === 'skipped_duplicate') {
    return { color: '#92400e', background: '#fef3c7', border: '#fcd34d', icon: AlertTriangle, label: normalized }
  }
  return { color: '#1e3a8a', background: '#dbeafe', border: '#93c5fd', icon: MessageSquare, label: normalized || 'queued' }
}

const formatDateTime = (value) => {
  const date = new Date(String(value || ''))
  if (Number.isNaN(date.getTime())) {
    return '--'
  }

  return date.toLocaleString()
}

const formatCompactDate = (value) => {
  const date = new Date(String(value || ''))
  if (Number.isNaN(date.getTime())) {
    return '--'
  }

  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const BotOpsManager = ({ hasPermission = () => false }) => {
  const { darkMode } = useAdminTheme()
  const fileInputRef = useRef(null)

  const [logs, setLogs] = useState([])
  const [logsLoading, setLogsLoading] = useState(true)
  const [logsError, setLogsError] = useState('')
  const [logLimit, setLogLimit] = useState(50)
  const [logSearch, setLogSearch] = useState('')
  const [logStatus, setLogStatus] = useState('')

  const [servicePreviewForm, setServicePreviewForm] = useState({
    name: '',
    serviceTime: '08:00',
    isFirstSunday: false
  })
  const [servicePreview, setServicePreview] = useState(null)
  const [servicePreviewLoading, setServicePreviewLoading] = useState(false)
  const [servicePreviewError, setServicePreviewError] = useState('')

  const [eventPreviewForm, setEventPreviewForm] = useState({
    name: '',
    eventTitle: '',
    eventDate: todayIso(),
    eventTime: '09:00',
    registrationLink: ''
  })
  const [eventPreview, setEventPreview] = useState(null)
  const [eventPreviewLoading, setEventPreviewLoading] = useState(false)
  const [eventPreviewError, setEventPreviewError] = useState('')

  const [importFile, setImportFile] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState('')

  const canView = hasPermission('content:visitors:read') || hasPermission('admin:settings:manage') || hasPermission('*')

  const loadLogs = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setLogsLoading(true)
    }
    setLogsError('')

    try {
      const payload = await fetchBotMessageLogs({ limit: logLimit })
      setLogs(Array.isArray(payload?.messages) ? payload.messages.map(mapBotMessageLog) : [])
    } catch (error) {
      setLogsError(error?.message || 'Unable to load bot message logs.')
    } finally {
      if (!silent) {
        setLogsLoading(false)
      }
    }
  }, [logLimit])

  useEffect(() => {
    if (!canView) {
      return
    }

    void loadLogs()
  }, [canView, loadLogs])

  const filteredLogs = useMemo(() => {
    const term = logSearch.trim().toLowerCase()
    return logs.filter((entry) => {
      const haystack = [
        entry.visitorName,
        entry.visitorPhone,
        entry.visitorEmail,
        entry.eventTitle,
        entry.providerName,
        entry.messageType,
        entry.status,
        entry.messageText,
        entry.error
      ].join(' ').toLowerCase()

      return (!logStatus || entry.status === logStatus) && (!term || haystack.includes(term))
    })
  }, [logs, logSearch, logStatus])

  const generateServicePreview = async () => {
    setServicePreviewLoading(true)
    setServicePreviewError('')
    try {
      const payload = await previewBotServiceReminder(servicePreviewForm)
      setServicePreview(payload)
    } catch (error) {
      setServicePreviewError(error?.message || 'Unable to generate service reminder preview.')
    } finally {
      setServicePreviewLoading(false)
    }
  }

  const generateEventPreview = async () => {
    setEventPreviewLoading(true)
    setEventPreviewError('')
    try {
      const payload = await previewBotEventReminder(eventPreviewForm)
      setEventPreview(payload)
    } catch (error) {
      setEventPreviewError(error?.message || 'Unable to generate event reminder preview.')
    } finally {
      setEventPreviewLoading(false)
    }
  }

  const handleImport = async () => {
    if (!importFile) {
      setImportError('Choose a CSV file before importing.')
      return
    }

    setImportLoading(true)
    setImportError('')
    setImportResult(null)

    try {
      const result = await importBotVisitorsCsv(importFile)
      setImportResult(result)
      setImportFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      setImportError(error?.message || 'Unable to import the CSV file.')
    } finally {
      setImportLoading(false)
    }
  }

  if (!canView) {
    return (
      <div style={{
        padding: '2rem',
        borderRadius: '1rem',
        border: `1px solid ${darkMode ? '#2a3550' : '#e5e7eb'}`,
        background: darkMode ? '#1a2235' : '#ffffff'
      }}>
        <h2 style={{ margin: '0 0 0.5rem', color: darkMode ? '#e2e8f0' : '#111827' }}>Bot Ops</h2>
        <p style={{ margin: 0, color: darkMode ? '#94a3b8' : '#475569' }}>
          You do not have permission to open the bot operations screen.
        </p>
      </div>
    )
  }

  const surface = darkMode ? '#151e2e' : '#ffffff'
  const panel = darkMode ? '#1a2235' : '#f9fafb'
  const border = darkMode ? '#2a3550' : '#dbe2ea'
  const text = darkMode ? '#e2e8f0' : '#0f172a'
  const subtext = darkMode ? '#94a3b8' : '#475569'

  return (
    <div style={{ display: 'grid', gap: '1rem' }}>
      <section style={{ display: 'grid', gap: '0.35rem' }}>
        <h1 style={{ margin: 0, fontSize: '2rem', color: text }}>Bot Ops</h1>
        <p style={{ margin: 0, color: subtext }}>
          Preview Sunday and event reminders, import visitors, and review delivered messages without leaving the admin console.
        </p>
      </section>

      <section
        style={{
          display: 'grid',
          gap: '0.85rem',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          padding: '1rem',
          border: `1px solid ${border}`,
          borderRadius: '0.85rem',
          background: surface
        }}
      >
        <label style={{ display: 'grid', gap: '0.35rem', color: subtext, fontSize: '0.82rem' }}>
          Search logs
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: `1px solid ${border}`, borderRadius: '0.55rem', background: panel, padding: '0 0.55rem' }}>
            <Search size={14} color={subtext} />
            <input
              type="text"
              value={logSearch}
              onChange={(event) => setLogSearch(event.target.value)}
              placeholder="Name, phone, event, message"
              style={{
                border: 0,
                outline: 'none',
                background: 'transparent',
                color: text,
                width: '100%',
                minWidth: 0,
                padding: '0.55rem 0'
              }}
            />
          </span>
        </label>

        <label style={{ display: 'grid', gap: '0.35rem', color: subtext, fontSize: '0.82rem' }}>
          Status
          <DropdownSelect
            value={logStatus}
            onChange={(event) => setLogStatus(event.target.value)}
            style={{ border: `1px solid ${border}`, borderRadius: '0.55rem', padding: '0.55rem', background: panel, color: text }}
          >
            <option value="">All statuses</option>
            <option value="queued">Queued</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="read">Read</option>
            <option value="failed">Failed</option>
            <option value="skipped_duplicate">Skipped duplicate</option>
          </DropdownSelect>
        </label>

        <label style={{ display: 'grid', gap: '0.35rem', color: subtext, fontSize: '0.82rem' }}>
          Rows
          <DropdownSelect
            value={String(logLimit)}
            onChange={(event) => setLogLimit(Number(event.target.value) || 50)}
            style={{ border: `1px solid ${border}`, borderRadius: '0.55rem', padding: '0.55rem', background: panel, color: text }}
          >
            {[25, 50, 100, 250].map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </DropdownSelect>
        </label>

        <div style={{ display: 'flex', alignItems: 'end', gap: '0.6rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => void loadLogs()}
            style={{
              border: `1px solid ${border}`,
              background: panel,
              color: text,
              borderRadius: '0.55rem',
              padding: '0.55rem 0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <RefreshCw size={14} />
            {logsLoading ? 'Refreshing...' : 'Refresh logs'}
          </button>
        </div>
      </section>

      {logsError ? (
        <section style={{ border: '1px solid #fca5a5', borderRadius: '0.75rem', background: '#fef2f2', color: '#991b1b', padding: '0.9rem 1rem' }}>
          {logsError}
        </section>
      ) : null}

      <section style={{ border: `1px solid ${border}`, borderRadius: '0.85rem', background: surface, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', padding: '1rem 1rem 0' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', color: text }}>Message Logs</h2>
            <p style={{ margin: '0.25rem 0 0', color: subtext, fontSize: '0.9rem' }}>
              {filteredLogs.length} row{filteredLogs.length === 1 ? '' : 's'} matched from {logs.length} loaded.
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: subtext, fontSize: '0.82rem' }}>
            <MessageSquare size={14} />
            Joined visitor and event metadata are included in the feed.
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', minWidth: '960px', borderCollapse: 'collapse', marginTop: '0.75rem' }}>
            <thead>
              <tr style={{ background: panel, color: subtext, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                <th style={{ textAlign: 'left', padding: '0.8rem' }}>Time</th>
                <th style={{ textAlign: 'left', padding: '0.8rem' }}>Visitor</th>
                <th style={{ textAlign: 'left', padding: '0.8rem' }}>Event</th>
                <th style={{ textAlign: 'left', padding: '0.8rem' }}>Status</th>
                <th style={{ textAlign: 'left', padding: '0.8rem' }}>Message</th>
              </tr>
            </thead>
            <tbody>
              {logsLoading ? (
                <tr>
                  <td colSpan={5} style={{ padding: '1.25rem', color: subtext }}>Loading logs...</td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: '1.25rem', color: subtext }}>
                    No message logs matched the current filters.
                  </td>
                </tr>
              ) : filteredLogs.map((entry) => {
                const tone = statusTone(entry.status)
                const StatusIcon = tone.icon
                return (
                  <tr key={entry.id || `${entry.visitorId}-${entry.createdAt}`} style={{ borderTop: `1px solid ${border}` }}>
                    <td style={{ padding: '0.9rem', verticalAlign: 'top', color: text, whiteSpace: 'nowrap' }}>
                      {formatDateTime(entry.createdAt || entry.sentTime)}
                    </td>
                    <td style={{ padding: '0.9rem', verticalAlign: 'top', color: text }}>
                      <div style={{ fontWeight: 700 }}>{entry.visitorName || 'Unknown visitor'}</div>
                      <div style={{ color: subtext, fontSize: '0.85rem' }}>
                        {entry.visitorPhone || 'No phone'}{entry.visitorEmail ? ` • ${entry.visitorEmail}` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '0.9rem', verticalAlign: 'top', color: text }}>
                      <div style={{ fontWeight: 700 }}>{entry.eventTitle || 'No event linked'}</div>
                      <div style={{ color: subtext, fontSize: '0.85rem' }}>
                        {entry.eventDate ? formatCompactDate(entry.eventDate) : 'No event date'}
                        {entry.eventTime ? ` • ${entry.eventTime}` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '0.9rem', verticalAlign: 'top' }}>
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          borderRadius: '999px',
                          padding: '0.35rem 0.65rem',
                          background: tone.background,
                          color: tone.color,
                          border: `1px solid ${tone.border}`,
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          textTransform: 'capitalize'
                        }}
                      >
                        <StatusIcon size={13} />
                        {tone.label.replace(/_/g, ' ')}
                      </span>
                      <div style={{ color: subtext, fontSize: '0.78rem', marginTop: '0.45rem' }}>
                        {entry.providerName || 'unknown provider'}
                        {entry.messageType ? ` • ${entry.messageType}` : ''}
                      </div>
                    </td>
                    <td style={{ padding: '0.9rem', verticalAlign: 'top', color: text }}>
                      <div style={{ maxWidth: '480px', lineHeight: 1.5 }}>
                        {entry.messageText || entry.error || '--'}
                      </div>
                      {entry.providerMessageId ? (
                        <div style={{ color: subtext, fontSize: '0.78rem', marginTop: '0.4rem' }}>
                          Provider ID: {entry.providerMessageId}
                        </div>
                      ) : null}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
        <article style={{ border: `1px solid ${border}`, borderRadius: '0.85rem', background: surface, padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', color: text }}>
            <Send size={16} />
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Service Reminder Preview</h2>
          </div>

          <div style={{ display: 'grid', gap: '0.8rem' }}>
            <label style={{ display: 'grid', gap: '0.35rem', color: subtext, fontSize: '0.82rem' }}>
              Recipient name
              <input
                type="text"
                value={servicePreviewForm.name}
                onChange={(event) => setServicePreviewForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Ada Obi"
                style={{
                  border: `1px solid ${border}`,
                  borderRadius: '0.55rem',
                  padding: '0.7rem',
                  background: panel,
                  color: text
                }}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <label style={{ display: 'grid', gap: '0.35rem', color: subtext, fontSize: '0.82rem' }}>
                Service time
                <input
                  type="time"
                  value={servicePreviewForm.serviceTime}
                  onChange={(event) => setServicePreviewForm((prev) => ({ ...prev, serviceTime: event.target.value }))}
                  style={{
                    border: `1px solid ${border}`,
                    borderRadius: '0.55rem',
                    padding: '0.7rem',
                    background: panel,
                    color: text
                  }}
                />
              </label>

              <label style={{ display: 'flex', alignItems: 'end', gap: '0.5rem', color: subtext, fontSize: '0.82rem' }}>
                <input
                  type="checkbox"
                  checked={servicePreviewForm.isFirstSunday}
                  onChange={(event) => setServicePreviewForm((prev) => ({ ...prev, isFirstSunday: event.target.checked }))}
                />
                First Sunday
              </label>
            </div>

            <button
              type="button"
              onClick={() => void generateServicePreview()}
              disabled={servicePreviewLoading}
              style={{
                border: '0',
                borderRadius: '0.65rem',
                background: '#0f172a',
                color: '#f8fafc',
                padding: '0.8rem 1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontWeight: 700,
                cursor: 'pointer',
                opacity: servicePreviewLoading ? 0.75 : 1
              }}
            >
              <Send size={15} />
              {servicePreviewLoading ? 'Generating...' : 'Generate preview'}
            </button>

            {servicePreviewError ? (
              <div style={{ border: '1px solid #fca5a5', borderRadius: '0.65rem', background: '#fef2f2', color: '#991b1b', padding: '0.8rem' }}>
                {servicePreviewError}
              </div>
            ) : null}

            {servicePreview ? (
              <div style={{ border: `1px solid ${border}`, borderRadius: '0.75rem', background: panel, padding: '0.9rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.6rem' }}>
                  <strong style={{ color: text }}>Generated message</strong>
                  <span style={{ color: subtext, fontSize: '0.82rem' }}>{formatDateTime(servicePreview.timestamp)}</span>
                </div>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6, color: text }}>{servicePreview.generatedMessage}</p>
              </div>
            ) : null}
          </div>
        </article>

        <article style={{ border: `1px solid ${border}`, borderRadius: '0.85rem', background: surface, padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', color: text }}>
            <Calendar size={16} />
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Event Reminder Preview</h2>
          </div>

          <div style={{ display: 'grid', gap: '0.8rem' }}>
            <label style={{ display: 'grid', gap: '0.35rem', color: subtext, fontSize: '0.82rem' }}>
              Recipient name
              <input
                type="text"
                value={eventPreviewForm.name}
                onChange={(event) => setEventPreviewForm((prev) => ({ ...prev, name: event.target.value }))}
                placeholder="Ada Obi"
                style={{
                  border: `1px solid ${border}`,
                  borderRadius: '0.55rem',
                  padding: '0.7rem',
                  background: panel,
                  color: text
                }}
              />
            </label>

            <label style={{ display: 'grid', gap: '0.35rem', color: subtext, fontSize: '0.82rem' }}>
              Event title
              <input
                type="text"
                value={eventPreviewForm.eventTitle}
                onChange={(event) => setEventPreviewForm((prev) => ({ ...prev, eventTitle: event.target.value }))}
                placeholder="Youth Revival Night"
                style={{
                  border: `1px solid ${border}`,
                  borderRadius: '0.55rem',
                  padding: '0.7rem',
                  background: panel,
                  color: text
                }}
              />
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <label style={{ display: 'grid', gap: '0.35rem', color: subtext, fontSize: '0.82rem' }}>
                Event date
                <input
                  type="date"
                  value={eventPreviewForm.eventDate}
                  onChange={(event) => setEventPreviewForm((prev) => ({ ...prev, eventDate: event.target.value }))}
                  style={{
                    border: `1px solid ${border}`,
                    borderRadius: '0.55rem',
                    padding: '0.7rem',
                    background: panel,
                    color: text
                  }}
                />
              </label>

              <label style={{ display: 'grid', gap: '0.35rem', color: subtext, fontSize: '0.82rem' }}>
                Event time
                <input
                  type="time"
                  value={eventPreviewForm.eventTime}
                  onChange={(event) => setEventPreviewForm((prev) => ({ ...prev, eventTime: event.target.value }))}
                  style={{
                    border: `1px solid ${border}`,
                    borderRadius: '0.55rem',
                    padding: '0.7rem',
                    background: panel,
                    color: text
                  }}
                />
              </label>
            </div>

            <label style={{ display: 'grid', gap: '0.35rem', color: subtext, fontSize: '0.82rem' }}>
              Registration link
              <input
                type="url"
                value={eventPreviewForm.registrationLink}
                onChange={(event) => setEventPreviewForm((prev) => ({ ...prev, registrationLink: event.target.value }))}
                placeholder="https://upperroom.example/register"
                style={{
                  border: `1px solid ${border}`,
                  borderRadius: '0.55rem',
                  padding: '0.7rem',
                  background: panel,
                  color: text
                }}
              />
            </label>

            <button
              type="button"
              onClick={() => void generateEventPreview()}
              disabled={eventPreviewLoading}
              style={{
                border: '0',
                borderRadius: '0.65rem',
                background: '#1d4ed8',
                color: '#f8fafc',
                padding: '0.8rem 1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontWeight: 700,
                cursor: 'pointer',
                opacity: eventPreviewLoading ? 0.75 : 1
              }}
            >
              <Send size={15} />
              {eventPreviewLoading ? 'Generating...' : 'Generate preview'}
            </button>

            {eventPreviewError ? (
              <div style={{ border: '1px solid #fca5a5', borderRadius: '0.65rem', background: '#fef2f2', color: '#991b1b', padding: '0.8rem' }}>
                {eventPreviewError}
              </div>
            ) : null}

            {eventPreview ? (
              <div style={{ border: `1px solid ${border}`, borderRadius: '0.75rem', background: panel, padding: '0.9rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.75rem', marginBottom: '0.6rem' }}>
                  <strong style={{ color: text }}>Generated message</strong>
                  <span style={{ color: subtext, fontSize: '0.82rem' }}>{formatDateTime(eventPreview.timestamp)}</span>
                </div>
                <p style={{ margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.6, color: text }}>{eventPreview.generatedMessage}</p>
              </div>
            ) : null}
          </div>
        </article>
      </section>

      <section style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(320px, 0.9fr)' }}>
        <article style={{ border: `1px solid ${border}`, borderRadius: '0.85rem', background: surface, padding: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', color: text }}>
            <FileUp size={16} />
            <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Visitor CSV Import</h2>
          </div>

          <p style={{ margin: '0 0 0.9rem', color: subtext, lineHeight: 1.6 }}>
            Upload a CSV with at least `phone_number`. Optional fields like `name`, `email`, `first_visit_date`, `tags`, and `timezone` are picked up when present.
          </p>

          <div style={{ display: 'grid', gap: '0.85rem' }}>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              onChange={(event) => {
                setImportFile(event.target.files?.[0] || null)
                setImportError('')
                setImportResult(null)
              }}
              style={{ color: text }}
            />

            <button
              type="button"
              onClick={() => void handleImport()}
              disabled={importLoading}
              style={{
                border: '0',
                borderRadius: '0.65rem',
                background: '#0f172a',
                color: '#f8fafc',
                padding: '0.8rem 1rem',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                fontWeight: 700,
                cursor: 'pointer',
                opacity: importLoading ? 0.75 : 1,
                width: 'fit-content'
              }}
            >
              <Upload size={15} />
              {importLoading ? 'Importing...' : 'Import CSV'}
            </button>

            {importError ? (
              <div style={{ border: '1px solid #fca5a5', borderRadius: '0.65rem', background: '#fef2f2', color: '#991b1b', padding: '0.8rem' }}>
                {importError}
              </div>
            ) : null}

            {importResult ? (
              <div style={{ border: `1px solid ${border}`, borderRadius: '0.75rem', background: panel, padding: '0.9rem' }}>
                <strong style={{ color: text }}>Import summary</strong>
                <div style={{ display: 'grid', gap: '0.3rem', marginTop: '0.65rem', color: subtext, fontSize: '0.9rem' }}>
                  <span>Total rows: {importResult.total ?? 0}</span>
                  <span>Imported: {importResult.imported ?? 0}</span>
                  <span>Failed: {importResult.failed ?? 0}</span>
                </div>
                {Array.isArray(importResult.errors) && importResult.errors.length > 0 ? (
                  <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.35rem' }}>
                    <strong style={{ color: text }}>Validation notes</strong>
                    <ul style={{ margin: 0, paddingLeft: '1.1rem', color: subtext, lineHeight: 1.5 }}>
                      {importResult.errors.slice(0, 6).map((error) => (
                        <li key={error}>{error}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </article>

        <aside style={{ border: `1px solid ${border}`, borderRadius: '0.85rem', background: surface, padding: '1rem' }}>
          <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem', color: text }}>Quick Notes</h2>
          <ul style={{ margin: 0, paddingLeft: '1.15rem', color: subtext, lineHeight: 1.7 }}>
            <li>Service reminders use the Saturday dispatch window already wired into the bot scheduler.</li>
            <li>Preview messages fall back to templates if the configured LLM provider is unavailable.</li>
            <li>Message logs include joined visitor and event metadata for faster triage.</li>
            <li>CSV imports rehydrate visitors and re-enable subscriptions when a phone number already exists.</li>
          </ul>
        </aside>
      </section>
    </div>
  )
}

export default BotOpsManager
