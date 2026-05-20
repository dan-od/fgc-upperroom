import { useContext } from 'react'
import { AdminThemeContext } from './AdminThemeContext'

const useAdminColors = () => {
  const { darkMode } = useContext(AdminThemeContext)

  const ui = {
    bg: darkMode ? '#0f172a' : '#f8fafc',
    card: darkMode ? '#1e293b' : '#ffffff',
    border: darkMode ? '#334155' : '#e2e8f0',
    text: darkMode ? '#e2e8f0' : '#1e293b',
    textMuted: darkMode ? '#94a3b8' : '#64748b',
    textFaint: darkMode ? '#64748b' : '#94a3b8',
    input: darkMode ? '#0f172a' : '#f8fafc',
    inputBorder: darkMode ? '#334155' : '#cbd5e1',
    accent: darkMode ? '#6366f1' : '#4f46e5',
    accentHover: darkMode ? '#818cf8' : '#4338ca',
    success: darkMode ? '#34d399' : '#10b981',
    warning: darkMode ? '#fbbf24' : '#f59e0b',
    error: darkMode ? '#f87171' : '#ef4444',
    badge: darkMode ? '#1e293b' : '#f1f5f9',
    shadow: darkMode ? '0 4px 6px rgba(0,0,0,0.4)' : '0 4px 6px rgba(0,0,0,0.07)',
  }

  return ui
}

export default useAdminColors
