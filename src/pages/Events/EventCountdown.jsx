export default function EventCountdown({ countdown }) {
  return (
    <div className="featured-event__countdown">
      <div className="countdown-item">
        <span className="countdown-number">{countdown.days}</span>
        <span className="countdown-label">Days</span>
      </div>
      <div className="countdown-item">
        <span className="countdown-number">{countdown.hours}</span>
        <span className="countdown-label">Hours</span>
      </div>
      <div className="countdown-item">
        <span className="countdown-number">{countdown.minutes}</span>
        <span className="countdown-label">Minutes</span>
      </div>
      <div className="countdown-item">
        <span className="countdown-number">{countdown.seconds}</span>
        <span className="countdown-label">Seconds</span>
      </div>
    </div>
  )
}
