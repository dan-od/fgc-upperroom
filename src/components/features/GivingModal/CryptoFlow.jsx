import { Button } from '../../common'
import { formatCurrency } from './useGivingFlow'

export function CryptoFlow({
  donorName, setDonorName,
  donorEmail, setDonorEmail,
  donorPhone, setDonorPhone,
  message, setMessage,
  customAmount, setCustomAmount, setAmount,
  paymentMethod,
  selectedAmount,
  submitting,
  error,
  handleSubmit,
  handleCopy,
  ethAddress,
  btcAddress,
  txHash, setTxHash,
  cryptoStep, setCryptoStep,
  verifying
}) {
  return (
    <>
      {/* Step 2: verification overlay (mini-modal) */}
      {cryptoStep === 'verification' && (
        <div className="giving-modal__overlay">
          <div className="giving-modal__mini-modal">
            <div className="giving-modal__mini-header">
              <h3>Verify Payment</h3>
              <p>Please enter the transaction hash (TxID) to verify your payment to:</p>
            </div>
            <div className="giving-modal__mini-address">
              <div className="giving-modal__copy-field">
                <input type="text" readOnly value={ethAddress} />
                <button type="button" className="giving-modal__copy-btn"
                  onClick={() => handleCopy(ethAddress)} title="Copy Address">
                  <i className="fa-solid fa-copy" />
                </button>
              </div>
            </div>
            <div className="giving-modal__verify-form">
              <div className="giving-modal__input-group">
                <label htmlFor="txHash">Transaction Hash (TxID)</label>
                <input id="txHash" type="text" required placeholder="0x..."
                  value={txHash} onChange={(e) => setTxHash(e.target.value)} />
              </div>
              {verifying && (
                <div className="giving-modal__loading-container">
                  <div className="giving-modal__loading-line" />
                  <small>On-chain verification in progress...</small>
                </div>
              )}
              <div className="giving-modal__verification-actions">
                <button type="button" className="giving-modal__back-btn"
                  onClick={() => setCryptoStep('form')} disabled={verifying}>
                  <i className="fa-solid fa-arrow-left" /> Go Back
                </button>
                <Button variant="primary" onClick={handleSubmit}
                  disabled={verifying || !txHash} className="giving-modal__verify-btn">
                  {verifying ? 'Verifying...' : 'Verify Now'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Step 1: donor form + wallet addresses */}
      <form className="giving-modal__form" onSubmit={handleSubmit}>
        <label className="giving-modal__label">
          <span>Custom Amount (USDT)</span>
          <input
            type="number" min="5" step="0.01"
            placeholder="Enter custom amount"
            value={customAmount}
            onChange={(e) => { setCustomAmount(e.target.value); setAmount(0) }}
          />
        </label>

        <div className="giving-modal__row">
          <label className="giving-modal__label">
            <span>Full Name <span aria-hidden="true">*</span></span>
            <input type="text" required minLength={2} autoComplete="name"
              value={donorName} onChange={(e) => setDonorName(e.target.value)} />
          </label>
          <label className="giving-modal__label">
            <span>Email Address <span aria-hidden="true">*</span></span>
            <input type="email" required autoComplete="email"
              value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} />
          </label>
        </div>

        <label className="giving-modal__label">
          <span>Phone Number</span>
          <input type="tel" autoComplete="tel"
            value={donorPhone} onChange={(e) => setDonorPhone(e.target.value)} />
        </label>

        <label className="giving-modal__label">
          <span>Message (Optional)</span>
          <textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
        </label>

        <div className="giving-modal__crypto-info">
          <div className="giving-modal__crypto-item">
            <span>USDT (ERC20/TRC20):</span>
            <div className="giving-modal__copy-field">
              <input type="text" readOnly value={ethAddress || 'Fetching address...'} />
              <button type="button" className="giving-modal__copy-btn"
                onClick={() => handleCopy(ethAddress)} title="Copy Address" disabled={!ethAddress}>
                <i className="fa-solid fa-copy" />
              </button>
            </div>
          </div>
          <div className="giving-modal__crypto-item">
            <span>BITCOIN (BTC):</span>
            <div className="giving-modal__copy-field">
              <input type="text" readOnly value={btcAddress || 'Contact Admin for Wallet'} />
              {btcAddress && (
                <button type="button" className="giving-modal__copy-btn"
                  onClick={() => handleCopy(btcAddress)} title="Copy Address">
                  <i className="fa-solid fa-copy" />
                </button>
              )}
            </div>
          </div>
          <small className="giving-modal__crypto-note">
            Please complete the form so we can track your giving.
          </small>
        </div>

        {error ? <p className="giving-modal__error" role="alert">{error}</p> : null}

        <div className="giving-modal__footer">
          <div className="giving-modal__total">
            <small>Total</small>
            <strong>{formatCurrency(selectedAmount, paymentMethod)}</strong>
          </div>
          <Button type="submit" variant="primary" size="md" disabled={submitting || verifying}>
            {submitting || verifying ? 'Processing…' : 'Verify Payment →'}
          </Button>
        </div>
      </form>
    </>
  )
}

export default CryptoFlow
