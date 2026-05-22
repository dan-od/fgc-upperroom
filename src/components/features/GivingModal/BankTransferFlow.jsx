import { Button } from '../../common'
import { formatCurrency } from './useGivingFlow'

export function BankTransferFlow({
  donorName, setDonorName, donorEmail, setDonorEmail, donorPhone, setDonorPhone,
  message, setMessage, customAmount, setCustomAmount, setAmount, paymentMethod,
  selectedAmount, submitting, error, handleSubmit, handleCopy,
  bankAccounts, selectedBankId, setSelectedBankId, selectedBankAccount,
  bankTransferStep, bankConfigLoading, bankConfigError, reference, goToReferencePage
}) {
  const bankDetailsReady = Boolean(selectedBankAccount)
  const isBankTransferReadyState = bankTransferStep === 'details'

  return (
    <form className="giving-modal__form" onSubmit={handleSubmit}>
      <label className="giving-modal__label">
        <span>Custom Amount (NGN)</span>
        <input type="number" min="100" step="1" placeholder="Enter custom amount" value={customAmount}
          onChange={(e) => { setCustomAmount(e.target.value); setAmount(0) }} />
      </label>

      {/* Step 1: bank preview */}
      {bankTransferStep === 'form' && (
        <div className="giving-modal__bank-info">
          {bankConfigLoading ? (
            <p className="giving-modal__bank-loading">Loading bank transfer details...</p>
          ) : bankDetailsReady ? (
            <>
              {bankAccounts.length > 1 && (
                <div className="giving-modal__bank-selector">
                  <span>Choose Bank</span>
                  <div className="giving-modal__bank-toggle" aria-label="Choose bank">
                    {bankAccounts.map((bank) => (
                      <button key={bank.id} type="button" aria-pressed={selectedBankAccount?.id === bank.id}
                        className={`giving-modal__bank-toggle-btn${selectedBankAccount?.id === bank.id ? ' is-active' : ''}`}
                        onClick={() => setSelectedBankId(bank.id)}>
                        <strong>{bank.bankName}</strong><small>{bank.accountNumber}</small>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="giving-modal__bank-item"><span>Bank Name</span><input type="text" readOnly value={selectedBankAccount?.bankName || ''} /></div>
              <div className="giving-modal__bank-item"><span>Account Name</span><input type="text" readOnly value={selectedBankAccount?.accountName || ''} /></div>
              <div className="giving-modal__bank-item">
                <span>Account Number</span>
                <div className="giving-modal__copy-field">
                  <input type="text" readOnly value={selectedBankAccount?.accountNumber || ''} />
                  <button type="button" className="giving-modal__copy-btn" title="Copy Account Number"
                    onClick={() => handleCopy(selectedBankAccount?.accountNumber)}><i className="fa-solid fa-copy" /></button>
                </div>
              </div>
              {selectedBankAccount?.details?.map((d) => (
                <div className="giving-modal__bank-item" key={`${d.label}:${d.value}`}>
                  <span>{d.label}</span><input type="text" readOnly value={d.value} />
                </div>
              ))}
              <small className="giving-modal__crypto-note">Fill the form to generate your transfer reference before sending payment.</small>
              {selectedBankAccount?.instructions && <p className="giving-modal__bank-note">{selectedBankAccount.instructions}</p>}
            </>
          ) : bankConfigError ? (
            <p className="giving-modal__bank-unavailable">{bankConfigError}</p>
          ) : (
            <p className="giving-modal__bank-unavailable">Bank transfer details are not configured yet. Please use Paystack or Crypto for now.</p>
          )}
        </div>
      )}

      <div className="giving-modal__row">
        <label className="giving-modal__label">
          <span>Full Name <span aria-hidden="true">*</span></span>
          <input type="text" required minLength={2} autoComplete="name" value={donorName} onChange={(e) => setDonorName(e.target.value)} />
        </label>
        <label className="giving-modal__label">
          <span>Email Address <span aria-hidden="true">*</span></span>
          <input type="email" required autoComplete="email" value={donorEmail} onChange={(e) => setDonorEmail(e.target.value)} />
        </label>
      </div>
      <label className="giving-modal__label">
        <span>Phone Number</span>
        <input type="tel" autoComplete="tel" value={donorPhone} onChange={(e) => setDonorPhone(e.target.value)} />
      </label>
      <label className="giving-modal__label">
        <span>Message (Optional)</span>
        <textarea rows={2} value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>

      {/* Step 2: confirmed bank details + reference */}
      {isBankTransferReadyState && (
        <div className="giving-modal__bank-info">
          <div className="giving-modal__bank-item"><span>Amount to Transfer</span><input type="text" readOnly value={formatCurrency(selectedAmount, paymentMethod)} /></div>
          <div className="giving-modal__bank-item"><span>Bank Name</span><input type="text" readOnly value={selectedBankAccount?.bankName || ''} /></div>
          <div className="giving-modal__bank-item"><span>Account Name</span><input type="text" readOnly value={selectedBankAccount?.accountName || ''} /></div>
          <div className="giving-modal__bank-item">
            <span>Account Number</span>
            <div className="giving-modal__copy-field">
              <input type="text" readOnly value={selectedBankAccount?.accountNumber || ''} />
              <button type="button" className="giving-modal__copy-btn" title="Copy Account Number"
                onClick={() => handleCopy(selectedBankAccount?.accountNumber)}><i className="fa-solid fa-copy" /></button>
            </div>
          </div>
          {selectedBankAccount?.details?.map((d) => (
            <div className="giving-modal__bank-item" key={`confirmed:${d.label}:${d.value}`}>
              <span>{d.label}</span><input type="text" readOnly value={d.value} />
            </div>
          ))}
          <div className="giving-modal__bank-item">
            <span>Transfer Reference</span>
            <div className="giving-modal__copy-field">
              <input type="text" readOnly value={reference || 'Generating reference...'} />
              <button type="button" className="giving-modal__copy-btn" title="Copy Reference"
                onClick={() => handleCopy(reference)} disabled={!reference}><i className="fa-solid fa-copy" /></button>
            </div>
          </div>
          <small className="giving-modal__crypto-note">Use this reference as your narration so the transfer can be matched quickly.</small>
          {selectedBankAccount?.instructions && <p className="giving-modal__bank-note">{selectedBankAccount.instructions}</p>}
        </div>
      )}

      {error ? <p className="giving-modal__error" role="alert">{error}</p> : null}

      <div className="giving-modal__footer">
        <div className="giving-modal__total"><small>Total</small><strong>{formatCurrency(selectedAmount, paymentMethod)}</strong></div>
        {isBankTransferReadyState ? (
          <Button type="button" variant="primary" size="md" onClick={goToReferencePage}>View Reference Page →</Button>
        ) : (
          <Button type="submit" variant="primary" size="md" disabled={submitting || !bankDetailsReady || bankConfigLoading}>
            {submitting ? 'Processing…' : 'Generate Transfer Reference →'}
          </Button>
        )}
      </div>
    </form>
  )
}

export default BankTransferFlow
