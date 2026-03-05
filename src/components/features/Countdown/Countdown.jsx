import { useState, useEffect } from 'react'
import './Countdown.css'

// Special events - Add dates here to override regular countdown
// Format: "YYYY-MM-DDTHH:MM:SS" in Nigerian local time (WAT - UTC+1)
const SPECIAL_EVENTS = [
  // {
  //   name: "Upper Room Week 2025",
  //   date: "2025-03-15T09:00:00",
  // },
]

// Weekly services schedule (Nigerian local time)
// Day: 0=Sunday, 1=Monday, ..., 5=Friday, 6=Saturday
// Hours are in 24-hour format
const WEEKLY_SERVICES = [
  { day: 0, name: 'Sunday Worship', hour: 7, minute: 30 },
  { day: 0, name: 'Sunday 2nd Service', hour: 9, minute: 30 },
  { day: 3, name: 'Midweek Bible Study', hour: 17, minute: 30 },
  { day: 5, name: 'Upper Room Meeting', hour: 17, minute: 0 }
]

const Countdown = ({ variant = 'default' }) => {
  const [timeLeft, setTimeLeft] = useState(null)
  const [nextEvent, setNextEvent] = useState(null)

  const findNextEvent = () => {
    const now = new Date()
    
    // Check special events first
    const upcomingSpecial = SPECIAL_EVENTS
      .map(e => ({ ...e, dateObj: new Date(e.date) }))
      .filter(e => e.dateObj > now)
      .sort((a, b) => a.dateObj - b.dateObj)[0]

    if (upcomingSpecial) {
      return {
        name: upcomingSpecial.name,
        date: upcomingSpecial.dateObj,
        isSpecial: true
      }
    }

    // Find next regular service
    for (let daysAhead = 0; daysAhead <= 7; daysAhead++) {
      const checkDate = new Date(now)
      checkDate.setDate(checkDate.getDate() + daysAhead)
      
      for (const service of WEEKLY_SERVICES) {
        if (checkDate.getDay() === service.day) {
          const serviceDate = new Date(checkDate)
          serviceDate.setHours(service.hour, service.minute, 0, 0)
          
          if (serviceDate > now) {
            return {
              name: service.name,
              date: serviceDate,
              isSpecial: false
            }
          }
        }
      }
    }
    return null
  }

  const calculateTimeLeft = (targetDate) => {
    const now = new Date()
    const diff = targetDate - now
    
    if (diff <= 0) return null
    
    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
      minutes: Math.floor((diff / 1000 / 60) % 60),
      seconds: Math.floor((diff / 1000) % 60)
    }
  }

  useEffect(() => {
    const update = () => {
      const event = findNextEvent()
      if (event) {
        setNextEvent(event)
        setTimeLeft(calculateTimeLeft(event.date))
      }
    }

    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  if (!nextEvent || !timeLeft) return null

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const formatDay = (date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long' })
  }

  return (
    <div className={`countdown countdown--${variant}`}>
      <p className="countdown__label">
        {nextEvent.isSpecial ? '🎉 Special Event' : 'Next Service'}
      </p>
      <h3 className="countdown__event">{nextEvent.name}</h3>
      <p className="countdown__time">
        {formatDay(nextEvent.date)} at {formatTime(nextEvent.date)}
      </p>
      
      <div className="countdown__timer">
        <div className="countdown__unit">
          <span className="countdown__number">{String(timeLeft.days).padStart(2, '0')}</span>
          <span className="countdown__text">Days</span>
        </div>
        <span className="countdown__sep">:</span>
        <div className="countdown__unit">
          <span className="countdown__number">{String(timeLeft.hours).padStart(2, '0')}</span>
          <span className="countdown__text">Hrs</span>
        </div>
        <span className="countdown__sep">:</span>
        <div className="countdown__unit">
          <span className="countdown__number">{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span className="countdown__text">Min</span>
        </div>
        <span className="countdown__sep">:</span>
        <div className="countdown__unit">
          <span className="countdown__number">{String(timeLeft.seconds).padStart(2, '0')}</span>
          <span className="countdown__text">Sec</span>
        </div>
      </div>
    </div>
  )
}

export default Countdown
