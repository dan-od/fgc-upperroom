export const ADMIN_DATE_FILTER_OPTIONS = [
  { value: 'all', label: 'All dates' },
  { value: 'today', label: 'Today' },
  { value: 'last7', label: 'Last 7 days' },
  { value: 'last30', label: 'Last 30 days' },
  { value: 'thisMonth', label: 'This month' },
  { value: 'thisYear', label: 'This year' }
]

const toSafeDate = (value) => {
  if (!value) return null
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(String(value))
  return Number.isNaN(date.getTime()) ? null : date
}

const startOfToday = () => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now
}

const getRangeStart = (filterValue) => {
  const today = startOfToday()

  switch (filterValue) {
    case 'today':
      return today
    case 'last7':
      return new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000)
    case 'last30':
      return new Date(today.getTime() - 29 * 24 * 60 * 60 * 1000)
    case 'thisMonth':
      return new Date(today.getFullYear(), today.getMonth(), 1)
    case 'thisYear':
      return new Date(today.getFullYear(), 0, 1)
    default:
      return null
  }
}

export const matchesAdminDateFilter = (value, filterValue = 'all') => {
  if (!filterValue || filterValue === 'all') return true

  const targetDate = toSafeDate(value)
  if (!targetDate) return false

  const start = getRangeStart(filterValue)
  if (!start) return true

  return targetDate.getTime() >= start.getTime()
}

export const resolveAdminDateFilterSince = (filterValue = 'all') => {
  const start = getRangeStart(filterValue)
  return start ? start.toISOString() : ''
}
