import { useState, useEffect, useRef } from 'react'
import { Button } from '../../common'
import DialogFrame from '../../common/Feedback/DialogFrame'
import { getAttendanceCurrent, submitAttendance } from '../../../utils/attendanceApi'
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
  { day: 0, name: 'Sunday Worship Service', hour: 8, minute: 0 }
]

const LIVE_SERVICE_DURATION_MINUTES = 180
const LIVE_STREAM_URL = import.meta.env.VITE_LIVE_STREAM_URL || 'https://www.youtube.com/@theupperroom_4sq/live'

const Countdown = ({ variant = 'default' }) => {
  const [timeLeft, setTimeLeft] = useState(null)
  const [nextEvent, setNextEvent] = useState(null)
  const [attendance, setAttendance] = useState({ visible: false, open: false, attendeeCount: 0, sessionReady: false, message: '' })
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', ''])
  const [selfName, setSelfName] = useState('')
  const [assistedPhone, setAssistedPhone] = useState('')
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [attendanceSubmitting, setAttendanceSubmitting] = useState(false)
  const [isAssistedMode, setIsAssistedMode] = useState(false)
  const [successModalOpen, setSuccessModalOpen] = useState(false)
  const codeRefs = useRef([])

  const successBlessingMessage = 'Thank you for worshipping with us today, God bless you and we hope to see you again next week!'
  const attendanceCode = codeDigits.join('')
  const isCodeComplete = codeDigits.every((digit) => digit !== '')

  const findNextEvent = () => {
    const now = new Date()

    // If we are currently inside a service window, switch the hero to live mode.
    for (let daysAhead = -1; daysAhead <= 0; daysAhead++) {
      const checkDate = new Date(now)
      checkDate.setDate(checkDate.getDate() + daysAhead)

      for (const service of WEEKLY_SERVICES) {
        if (checkDate.getDay() !== service.day) continue

        const serviceStart = new Date(checkDate)
        serviceStart.setHours(service.hour, service.minute, 0, 0)

        const serviceEnd = new Date(serviceStart.getTime() + LIVE_SERVICE_DURATION_MINUTES * 60 * 1000)

        if (now >= serviceStart && now < serviceEnd) {
          return {
            name: service.name,
            date: serviceStart,
            endDate: serviceEnd,
            isSpecial: false,
            isLive: true
          }
        }
      }
    }
    
    // Check special events first
    const upcomingSpecial = SPECIAL_EVENTS
      .map(e => ({ ...e, dateObj: new Date(e.date) }))
      .filter(e => e.dateObj > now)
      .sort((a, b) => a.dateObj - b.dateObj)[0]

    if (upcomingSpecial) {
      return {
        name: upcomingSpecial.name,
        date: upcomingSpecial.dateObj,
        isSpecial: true,
        isLive: false
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
              isSpecial: false,
              isLive: false
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
        if (event.isLive) {
          setTimeLeft(calculateTimeLeft(event.endDate))
        } else {
          setTimeLeft(calculateTimeLeft(event.date))
        }
      }
    }

    update()
    const timer = setInterval(update, 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (variant !== 'hero') return undefined

    let mounted = true

    const refreshAttendance = async () => {
      const result = await getAttendanceCurrent()
      if (!mounted || !result.ok || !result.data) return
      setAttendance(result.data)
    }

    refreshAttendance()
    const poller = setInterval(refreshAttendance, 8000)

    return () => {
      mounted = false
      clearInterval(poller)
    }
  }, [variant])

  if (!nextEvent) return null
  if (!nextEvent.isLive && !timeLeft) return null

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

  const handleSelfSubmit = async (event) => {
    event.preventDefault()
    setAttendanceSubmitting(true)
    setFeedback({ type: '', message: '' })

    const result = await submitAttendance({
      mode: 'self',
      name: selfName,
      code: attendanceCode
    })

    const payload = result.data || {}
    if (typeof payload.attendeeCount === 'number') {
      setAttendance((prev) => ({ ...prev, attendeeCount: payload.attendeeCount }))
    }

    if (payload.reason === 'duplicate') {
      setFeedback({ type: 'duplicate', message: 'You already signed the attendance' })
      setIsAssistedMode(true)
      setAttendanceSubmitting(false)
      return
    }

    if (!payload.success) {
      setFeedback({ type: 'error', message: payload.message || 'Unable to sign attendance right now.' })
      setAttendanceSubmitting(false)
      return
    }

    setFeedback({ type: '', message: '' })
    setSuccessModalOpen(true)
    setSelfName('')
    setCodeDigits(['', '', '', '', '', ''])
    setAttendanceSubmitting(false)
  }

  const handleAssistedSubmit = async (event) => {
    event.preventDefault()
    setAttendanceSubmitting(true)
    setFeedback({ type: '', message: '' })

    const result = await submitAttendance({
      mode: 'assisted',
      name: selfName,
      code: attendanceCode,
      helperName: selfName,
      assistedName: selfName,
      assistedPhone
    })

    const payload = result.data || {}
    if (typeof payload.attendeeCount === 'number') {
      setAttendance((prev) => ({ ...prev, attendeeCount: payload.attendeeCount }))
    }

    if (payload.reason === 'duplicate') {
      setFeedback({ type: 'duplicate', message: 'You already signed the attendance' })
      setAttendanceSubmitting(false)
      return
    }

    if (!payload.success) {
      setFeedback({ type: 'error', message: payload.message || 'Unable to submit assisted signing right now.' })
      setAttendanceSubmitting(false)
      return
    }

    setFeedback({ type: '', message: '' })
    setSuccessModalOpen(true)
    setAttendanceSubmitting(false)
    setSelfName('')
    setCodeDigits(['', '', '', '', '', ''])
    setAssistedPhone('')
    setIsAssistedMode(false)
  }

  const handleDigitChange = (index, rawValue) => {
    const digit = rawValue.replace(/\D/g, '').slice(-1)
    const next = [...codeDigits]
    next[index] = digit
    setCodeDigits(next)

    if (digit && index < 5) {
      codeRefs.current[index + 1]?.focus()
    }
  }

  const handleDigitKeyDown = (index, event) => {
    if (event.key === 'Backspace' && !codeDigits[index] && index > 0) {
      codeRefs.current[index - 1]?.focus()
    }

    if (event.key === 'ArrowLeft' && index > 0) {
      event.preventDefault()
      codeRefs.current[index - 1]?.focus()
    }

    if (event.key === 'ArrowRight' && index < 5) {
      event.preventDefault()
      codeRefs.current[index + 1]?.focus()
    }
  }

  const handleDigitPaste = (event) => {
    event.preventDefault()
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return

    const next = ['', '', '', '', '', '']
    for (let i = 0; i < pasted.length; i += 1) {
      next[i] = pasted[i]
    }

    setCodeDigits(next)
    const focusIndex = Math.min(pasted.length, 5)
    codeRefs.current[focusIndex]?.focus()
  }

  const renderCountdownLeft = () => (
    <>
      <p className="countdown__label">
        {nextEvent.isLive ? 'Service Live' : nextEvent.isSpecial ? 'Special Event' : 'Next Service'}
      </p>
      <h3 className="countdown__event">{nextEvent.name}</h3>
      {nextEvent.isLive ? (
        <>
          <p className="countdown__live-text">Join the service live now.</p>
          <a className="countdown__live-link" href={LIVE_STREAM_URL} target="_blank" rel="noopener noreferrer">
            Join Service Live
          </a>
          {timeLeft ? (
            <p className="countdown__live-subtext">
              Live window closes in {String(timeLeft.hours).padStart(2, '0')}:{String(timeLeft.minutes).padStart(2, '0')}:{String(timeLeft.seconds).padStart(2, '0')}
            </p>
          ) : null}
        </>
      ) : (
        <p className="countdown__time">
          {formatDay(nextEvent.date)} at {formatTime(nextEvent.date)}
        </p>
      )}

      {!nextEvent.isLive ? (
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
      ) : null}
    </>
  )

  return (
    <>
      <div className={`countdown countdown--${variant}${nextEvent.isLive ? ' countdown--live' : ' countdown--upcoming'}`}>
        {variant === 'hero' && attendance.visible ? (
          <div className="countdown__split">
            <div className="countdown__split-left">
              {renderCountdownLeft()}
            </div>

            <div className="countdown__divider" />

            <div className="countdown__split-right">
              <div className="countdown__attendance-panel">
                <div className="countdown__attendance-header">
                  <div className="countdown__attendance-copy">
                    <p className="countdown__attendance-label">Attendance</p>
                    <p className="countdown__attendance-count-text">People marked present</p>
                  </div>
                  <div className="countdown__attendance-stat">
                    <div className="countdown__attendance-count">{attendance.attendeeCount}</div>
                  </div>
                </div>

                {!attendance.sessionReady ? (
                  <p className="countdown__feedback countdown__feedback--duplicate">
                    Attendance code will be shared by the admin during service.
                  </p>
                ) : null}

                <form className="countdown__attendance-form" onSubmit={isAssistedMode ? handleAssistedSubmit : handleSelfSubmit}>
                  <div className="countdown__field-row">
                    <label className="countdown__field-label" htmlFor="attendance-first-name">First name</label>
                    <input
                      id="attendance-first-name"
                      type="text"
                      value={selfName}
                      onChange={(e) => setSelfName(e.target.value)}
                      placeholder="Enter first name"
                      className="countdown__input countdown__input--name"
                      required
                      disabled={attendanceSubmitting || !attendance.sessionReady}
                    />
                  </div>

                  {isAssistedMode ? (
                    <div className="countdown__field-row">
                      <label className="countdown__field-label" htmlFor="attendance-phone-number">Phone number</label>
                      <input
                        id="attendance-phone-number"
                        type="tel"
                        value={assistedPhone}
                        onChange={(e) => setAssistedPhone(e.target.value)}
                        placeholder="Enter phone number"
                        className="countdown__input"
                        required
                        disabled={attendanceSubmitting || !attendance.sessionReady}
                      />
                    </div>
                  ) : null}

                  <div className="countdown__field-row countdown__field-row--code">
                    <span className="countdown__field-label">Attendance Code</span>
                    <div className="countdown__code-inputs" onPaste={handleDigitPaste}>
                      {codeDigits.map((digit, index) => (
                        <input
                          key={index}
                          ref={(node) => {
                            codeRefs.current[index] = node
                          }}
                          type="text"
                          inputMode="numeric"
                          autoComplete="one-time-code"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleDigitChange(index, e.target.value)}
                          onKeyDown={(e) => handleDigitKeyDown(index, e)}
                          className={`countdown__code-digit ${isCodeComplete ? 'countdown__code-digit--complete' : ''}`}
                          aria-label={`Attendance code digit ${index + 1}`}
                          disabled={attendanceSubmitting || !attendance.sessionReady}
                        />
                      ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="countdown__submit"
                    disabled={attendanceSubmitting || !attendance.sessionReady || !isCodeComplete || !selfName.trim() || (isAssistedMode && !assistedPhone.trim())}
                  >
                    {attendanceSubmitting ? 'Submitting...' : isAssistedMode ? 'Submit Assisted Attendance' : 'Mark Attendance'}
                  </button>
                </form>

                {feedback.message ? (
                  <p className={`countdown__feedback countdown__feedback--${feedback.type || 'info'}`}>{feedback.message}</p>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          renderCountdownLeft()
        )}
      </div>

      <DialogFrame
        isOpen={successModalOpen}
        onClose={() => setSuccessModalOpen(false)}
        title="Attendance Signed"
        tone="success"
        maxWidth="540px"
        footer={(
          <Button type="button" variant="secondary" onClick={() => setSuccessModalOpen(false)}>
            Close
          </Button>
        )}
      >
        <p className="countdown__success-modal-message">{successBlessingMessage}</p>
      </DialogFrame>
    </>
  )
}

export default Countdown
