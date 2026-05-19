import { useRef } from 'react'
import { Bell } from 'lucide-react'
import { formatRelativeTime } from '../../../utils/adminFormatters'

const AdminNotifications = ({
  notifications,
  loading,
  isOpen,
  onToggle,
  onRefresh,
  onOpenSettings,
  updatedAt,
  notificationsEnabled,
  issueCount,
  notificationRef
}) => {
  return (
    <div className="admin-notifications" ref={notificationRef}>
      <button
        type="button"
        className="admin-notifications__button"
        onClick={onToggle}
        aria-label="Open notifications"
        aria-expanded={isOpen}
        aria-haspopup="menu"
        title="Notifications"
      >
        <Bell size={16} />
        {notificationsEnabled && issueCount > 0 ? (
          <span className="admin-notifications__badge">{issueCount > 9 ? '9+' : issueCount}</span>
        ) : null}
      </button>

      {isOpen ? (
        <div className="admin-notifications__menu" role="menu">
          <div className="admin-notifications__menu-head">
            <div>
              <strong>Notifications</strong>
              <p>{updatedAt ? `Updated ${formatRelativeTime(updatedAt)}` : 'Checking status...'}</p>
            </div>
            <button
              type="button"
              className="admin-notifications__refresh"
              onClick={onRefresh}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {!notificationsEnabled ? (
            <div className="admin-notifications__empty">
              <p>Notifications are disabled in Settings.</p>
              <button
                type="button"
                className="admin-notifications__open-settings"
                onClick={onOpenSettings}
              >
                Open Settings
              </button>
            </div>
          ) : null}

          {notificationsEnabled && notifications.length === 0 ? (
            <div className="admin-notifications__empty">
              <p>No notifications right now.</p>
            </div>
          ) : null}

          {notificationsEnabled && notifications.length > 0 ? (
            <ul className="admin-notifications__list">
              {notifications.map((item) => (
                <li key={item.id} className={`admin-notifications__item admin-notifications__item--${item.level}`}>
                  <div className="admin-notifications__meta-line">
                    <span className="admin-notifications__source">{item.source}</span>
                    <span className="admin-notifications__time">{formatRelativeTime(item.time)}</span>
                  </div>
                  <p className="admin-notifications__title">{item.title}</p>
                  <p className="admin-notifications__detail">{item.detail}</p>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export default AdminNotifications
