import { createContext, useContext } from 'react'

export const AdminThemeContext = createContext({ darkMode: false, toggleDark: () => {} })

export const useAdminTheme = () => useContext(AdminThemeContext)
