import { Lock, LogOut, X } from 'lucide-react'

const AdminSidebar = ({ tabs, activeTab, onTabChange, onLogout, componentPreloaders, onMobileClose }) => {
  return (
    <aside className={`admin-sidebar`}>
      <div className="admin-logo">
        <div className="admin-logo__icon">
          <Lock size={22} />
        </div>
        <div>
          <h2>Admin Center</h2>
          <p>Upperroom Workspace</p>
        </div>
        <button className="admin-sidebar-close" onClick={onMobileClose}>
          <X size={20} />
        </button>
      </div>

      <nav className="admin-nav">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              className={`admin-nav-btn ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => {
                onTabChange(tab.id)
                onMobileClose()
              }}
              onMouseEnter={() => componentPreloaders[tab.id]?.()}
              onFocus={() => componentPreloaders[tab.id]?.()}
            >
              <Icon size={18} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </nav>

      <button className="admin-logout-btn" onClick={onLogout}>
        <LogOut size={18} />
        <span>Logout</span>
      </button>
    </aside>
  )
}

export default AdminSidebar
