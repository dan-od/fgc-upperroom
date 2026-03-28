const LAGOS_TZ = 'Africa/Lagos'

const PARTS_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: LAGOS_TZ,
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  weekday: 'short'
})

const WEEKDAY_MAP = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6
}

export const getClientAttendanceWindowStatus = (date = new Date()) => {
  const parts = PARTS_FORMATTER.formatToParts(date)
  const bag = {}

  for (const part of parts) {
    if (part.type !== 'literal') {
      bag[part.type] = part.value
    }
  }

  const weekday = WEEKDAY_MAP[bag.weekday]
  const hour = Number(bag.hour)
  const isSunday = weekday === 0

  return {
    isSunday,
    isOpen: isSunday && hour < 18,
    timezone: LAGOS_TZ,
    testMode: false
  }
}

