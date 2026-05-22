import { AlertTriangle, CheckCircle2, MessageSquare, XCircle } from 'lucide-react'
import { formatCompactDate, formatDateTime } from '../../../utils/adminFormatters'

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

export default function BotLogsTable({ filteredLogs, loading, darkMode, ui }) {
  const { panel, border, text, subtext } = ui

  return (
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
          {loading ? (
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
  )
}
