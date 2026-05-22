import { useMemo, useState } from 'react'
import { MessageSquare, RefreshCw, Search } from 'lucide-react'
import { DropdownSelect } from '../../../components/common'
import BotLogsTable from './BotLogsTable'

export default function BotMessageLogs({ logs, loading, onRefresh, darkMode, ui }) {
  const { surface, panel, border, text, subtext } = ui

  const [logSearch, setLogSearch] = useState('')
  const [logStatus, setLogStatus] = useState('')
  const [logLimit, setLogLimit] = useState(50)

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

  return (
    <>
      <section
        style={{
          display: 'grid',
          gap: '0.85rem',
          gridTemplateColumns: 'minmax(0, 2.1fr) repeat(2, minmax(0, 1fr)) minmax(0, 0.9fr)',
          padding: '1rem',
          border: `1px solid ${border}`,
          borderRadius: '0.85rem',
          background: surface,
          alignItems: 'stretch'
        }}
      >
        <label style={{ display: 'grid', gap: '0.35rem', color: subtext, fontSize: '0.82rem', minWidth: 0 }}>
          Search logs
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', border: `1px solid ${border}`, borderRadius: '0.55rem', background: panel, padding: '0 0.55rem' }}>
            <Search size={14} color={subtext} />
            <input
              type="text"
              value={logSearch}
              onChange={(event) => setLogSearch(event.target.value)}
              placeholder="Name, phone, event, message"
              style={{ border: 0, outline: 'none', background: 'transparent', color: text, width: '100%', minWidth: 0, padding: '0.55rem 0' }}
            />
          </span>
        </label>

        <label style={{ display: 'grid', gap: '0.35rem', color: subtext, fontSize: '0.82rem', minWidth: 0 }}>
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

        <label style={{ display: 'grid', gap: '0.35rem', color: subtext, fontSize: '0.82rem', minWidth: 0 }}>
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

        <div style={{ display: 'flex', alignItems: 'end', gap: '0.6rem', minWidth: 0 }}>
          <button
            type="button"
            onClick={() => void onRefresh()}
            style={{
              border: `1px solid ${border}`,
              background: panel,
              color: text,
              borderRadius: '0.55rem',
              padding: '0.55rem 0.75rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              justifyContent: 'center',
              width: '100%'
            }}
          >
            <RefreshCw size={14} />
            {loading ? 'Refreshing...' : 'Refresh logs'}
          </button>
        </div>
      </section>

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

        <BotLogsTable filteredLogs={filteredLogs} loading={loading} darkMode={darkMode} ui={ui} />
      </section>
    </>
  )
}
