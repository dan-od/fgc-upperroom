export const isFirstSunday = (date) => date.getDay() === 0 && date.getDate() <= 7

export const getSundayServiceTimeWAT = (date) => (isFirstSunday(date) ? '07:30' : '08:00')

export const toDateAtTime = (date, hhmm, timeZone = 'Africa/Lagos') => {
  const [hour, minute] = hhmm.split(':').map(Number)
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })

  const parts = formatter.formatToParts(date)
  const year = Number(parts.find((p) => p.type === 'year')?.value)
  const month = Number(parts.find((p) => p.type === 'month')?.value) - 1
  const day = Number(parts.find((p) => p.type === 'day')?.value)

  return new Date(Date.UTC(year, month, day, hour - 1, minute, 0))
}
