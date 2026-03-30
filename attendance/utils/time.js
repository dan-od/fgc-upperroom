const LAGOS_TZ = 'Africa/Lagos'

const isTestWindowForcedOpen = () => {
  const flag = String(process.env.ATTENDANCE_TEST_OPEN || '').toLowerCase()
  return flag === '1' || flag === 'true' || flag === 'yes' || flag === 'on'
}

const PARTS_FORMATTER = new Intl.DateTimeFormat('en-US', {
  timeZone: LAGOS_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  weekday: 'short'
})

export const lagosNow = () => new Date()

export const getLagosParts = (date = new Date()) => {
  const parts = PARTS_FORMATTER.formatToParts(date)
  const bag = {}

  for (const part of parts) {
    if (part.type !== 'literal') {
      bag[part.type] = part.value
    }
  }

  const weekdayMap = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6
  }

  return {
    year: Number(bag.year),
    month: Number(bag.month),
    day: Number(bag.day),
    hour: Number(bag.hour),
    minute: Number(bag.minute),
    second: Number(bag.second),
    weekday: weekdayMap[bag.weekday]
  }
}

export const formatServiceDate = (date = new Date()) => {
  const parts = getLagosParts(date)
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`
}

export const isAttendanceWindowOpen = (date = new Date()) => {
  if (isTestWindowForcedOpen()) return true
  const parts = getLagosParts(date)
  return parts.weekday === 0 && parts.hour < 18
}

export const getWindowStatus = (date = new Date()) => {
  const closesAt = `${formatServiceDate(date)}T18:00:00+01:00`

  if (isTestWindowForcedOpen()) {
    return {
      isOpen: true,
      isSunday: true,
      closesAt,
      timezone: LAGOS_TZ,
      testMode: true
    }
  }

  const parts = getLagosParts(date)
  const isSunday = parts.weekday === 0
  const isOpen = isSunday && parts.hour < 18

  return {
    isOpen,
    isSunday,
    closesAt: isSunday ? closesAt : null,
    timezone: LAGOS_TZ,
    testMode: false
  }
}
