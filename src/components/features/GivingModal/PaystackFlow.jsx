import { Button } from '../../common'
import { formatCurrency } from './useGivingFlow'

export function PaystackFlow({
  donorName, setDonorName,
  donorEmail, setDonorEmail,
  donorPhone, setDonorPhone,
  message, setMessage,
  customAmount, setCustomAmount, setAmount,
  paymentMethod,
  selectedAmount,
  submitting,
  error,
  handleSubmit
}) {
  return (
    <form className="giving-modal__form" onSubmit={handleSubmit}>
      <label className="giving-modal__label">
        <span>Custom Amount (NGN)</span>
        <input
          type="number"
          min="100"
          step="1"
          placeholder="Enter custom amount"
          value={customAmount}
          onChange={(e) => { setCustomAmount(e.target.value); setAmount(0) }}
        />
      </label>

      <div className="giving-modal__row">
        <label className="giving-modal__label">
          <span>Full Name <span aria-hidden="true">*</span></span>
          <input
            type="text" required minLength={2} autoComplete="name"
            value={donorName} onChange={(e) => setDonorName(e.target.value)}
          />
        </label>
        <label className="giving-modal__label">
          <span>Email Address <span aria-hidden="true">*</span></span>
          <input
            type="email" required autoComplete="email"
            value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)}
          />
        </label>
      </div>

      <label className="giving-modal__label">
        <span>Phone Number</span>
        <input
          type="tel" autoComplete="tel"
          value={donorPhone} onChange={(e) => setDonorPhone(e.target.value)}
        />
      </label>

      <label className="giving-modal__label">
        <span>Message (Optional)</span>
        <textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>

      {error ? <p className="giving-modal__error" role="alert">{error}</p> : null}

      <div className="giving-modal__footer">
        <div className="giving-modal__total">
          <small>Total</small>
          <strong>{formatCurrency(selectedAmount, paymentMethod)}</strong>
        </div>
        <Button type="submit" variant="primary" size="md" disabled={submitting}>
          {submitting ? 'Opening Paystack…' : 'Pay with Paystack →'}
        </Button>
      </div>
    </form>
  )
}

export default PaystackFlow
