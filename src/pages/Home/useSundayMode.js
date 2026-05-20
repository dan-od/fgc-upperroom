import { useState, useEffect } from 'react'
import { getAttendanceCurrent } from '../../utils/attendanceApi'
import { getClientAttendanceWindowStatus } from '../../utils/attendanceWindow'

const HERO_SUNDAY_CACHE_KEY = 'upperroom_hero_sunday_mode'

export const readCachedSundayMode = () => {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.sessionStorage.getItem(HERO_SUNDAY_CACHE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw)
    const cachedAt = Number(parsed?.cachedAt || 0)
    if (!cachedAt || Date.now() - cachedAt > 5 * 60 * 1000) {
      window.sessionStorage.removeItem(HERO_SUNDAY_CACHE_KEY)
      return null
    }

    if (typeof parsed?.isSunday === 'boolean') {
      return parsed.isSunday
    }
  } catch {
    return null
  }

  return null
}

export const writeCachedSundayMode = (isSunday) => {
  if (typeof window === 'undefined') return

  try {
    window.sessionStorage.setItem(HERO_SUNDAY_CACHE_KEY, JSON.stringify({
      isSunday: Boolean(isSunday),
      cachedAt: Date.now()
    }))
  } catch {
    // Ignore storage issues and continue with in-memory state only.
  }
}

export const getInitialSundayMode = () => {
  const cachedMode = readCachedSundayMode()
  if (typeof cachedMode === 'boolean') {
    return cachedMode
  }

  return getClientAttendanceWindowStatus().isOpen
}

const useSundayMode = () => {
  const [isSunday, setIsSunday] = useState(getInitialSundayMode)

  // Keep the hero CTA aligned with the attendance service's Sunday window.
  useEffect(() => {
    let mounted = true

    const syncSundayWindow = async () => {
      const result = await getAttendanceCurrent()
      if (!mounted) return

      if (!result.ok || !result.data) {
        const fallbackWindow = getClientAttendanceWindowStatus()
        setIsSunday(fallbackWindow.isOpen)
        writeCachedSundayMode(fallbackWindow.isOpen)
        return
      }

      const serverWindow = result.data?.window
      const nextSundayMode = typeof serverWindow?.isOpen === 'boolean'
        ? serverWindow.isOpen
        : typeof result.data?.open === 'boolean'
          ? result.data.open
          : getClientAttendanceWindowStatus().isOpen

      setIsSunday(nextSundayMode)
      writeCachedSundayMode(nextSundayMode)
    }

    syncSundayWindow()
    const timer = setInterval(syncSundayWindow, 30000)

    return () => {
      mounted = false
      clearInterval(timer)
    }
  }, [])

  return { isSunday, setIsSunday }
}

export default useSundayMode
