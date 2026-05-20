import { useGivingFlow } from './useGivingFlow'
import { FundSelector } from './FundSelector'
import { PaystackFlow } from './PaystackFlow'
import { BankTransferFlow } from './BankTransferFlow'
import { CryptoFlow } from './CryptoFlow'
import './GivingModal.css'

export function GivingModal({ isOpen, onClose, initialFund = 'general', ctaRef = '' }) {
  const flow = useGivingFlow({ isOpen, onClose, defaultFund: initialFund, ctaRef })

  if (!isOpen) return null

  const {
    panelRef, closeRef,
    fund, setFund,
    amount, setAmount,
    customAmount, setCustomAmount,
    donorName, setDonorName,
    donorEmail, setDonorEmail,
    donorPhone, setDonorPhone,
    message, setMessage,
    submitting,
    paymentMethod, setPaymentMethod,
    reference,
    ethAddress, btcAddress,
    bankConfigLoading, bankConfigError,
    bankAccounts,
    selectedBankId, setSelectedBankId,
    selectedBankAccount,
    bankTransferStep,
    txHash, setTxHash,
    cryptoStep, setCryptoStep,
    verifying,
    error,
    selectedAmount,
    handleCopy,
    handlePresetClick,
    handleSubmit,
    goToReferencePage
  } = flow

  const showToggle = cryptoStep === 'form' && bankTransferStep === 'form'

  const headerText =
    paymentMethod === 'bank-transfer'
      ? 'Generate a transfer reference, then send the exact amount to the church account below.'
      : paymentMethod === 'paystack'
      ? 'Secure checkout via Paystack. A secure checkout window will open here to complete payment.'
      : 'Support the mission using USDT or Bitcoin. Transfer to the wallets below.'

  return (
    <div className="giving-modal-overlay" onClick={onClose}>
      <div
        ref={panelRef}
        className="giving-modal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="giving-modal-title"
      >
        {/* LEFT PANEL */}
        <div className="giving-modal__left">
          <button
            ref={closeRef}
            type="button"
            className="giving-modal__close"
            aria-label="Close giving modal"
            onClick={onClose}
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>

          <div className="giving-modal__header">
            <h2 id="giving-modal-title">
              <i className="fa-solid fa-hand-holding-heart giving-modal__title-icon" aria-hidden="true" />
              Support the mission
            </h2>
            <p>{headerText}</p>
          </div>

          <FundSelector
            fund={fund}
            setFund={setFund}
            selectedAmount={selectedAmount}
            customAmount={customAmount}
            setCustomAmount={setCustomAmount}
            setAmount={setAmount}
            paymentMethod={paymentMethod}
            handlePresetClick={handlePresetClick}
          />
        </div>

        {/* RIGHT PANEL */}
        <div className="giving-modal__right">
          {showToggle && (
            <div className="giving-modal__payment-toggle">
              <button
                type="button"
                className={`giving-modal__toggle-btn${paymentMethod === 'bank-transfer' ? ' is-active' : ''}`}
                onClick={() => setPaymentMethod('bank-transfer')}
              >
                <i className="fa-solid fa-building-columns" /> Bank Transfer
              </button>
              <button
                type="button"
                className={`giving-modal__toggle-btn${paymentMethod === 'paystack' ? ' is-active' : ''}`}
                onClick={() => setPaymentMethod('paystack')}
              >
                <i className="fa-solid fa-credit-card" /> Paystack
              </button>
              <button
                type="button"
                className={`giving-modal__toggle-btn${paymentMethod === 'crypto' ? ' is-active' : ''}`}
                onClick={() => setPaymentMethod('crypto')}
              >
                <i className="fa-solid fa-coins" /> Crypto
              </button>
            </div>
          )}

          {paymentMethod === 'paystack' && (
            <PaystackFlow
              donorName={donorName} setDonorName={setDonorName}
              donorEmail={donorEmail} setDonorEmail={setDonorEmail}
              donorPhone={donorPhone} setDonorPhone={setDonorPhone}
              message={message} setMessage={setMessage}
              customAmount={customAmount} setCustomAmount={setCustomAmount} setAmount={setAmount}
              paymentMethod={paymentMethod}
              selectedAmount={selectedAmount}
              submitting={submitting}
              error={error}
              handleSubmit={handleSubmit}
            />
          )}

          {paymentMethod === 'bank-transfer' && (
            <BankTransferFlow
              donorName={donorName} setDonorName={setDonorName}
              donorEmail={donorEmail} setDonorEmail={setDonorEmail}
              donorPhone={donorPhone} setDonorPhone={setDonorPhone}
              message={message} setMessage={setMessage}
              customAmount={customAmount} setCustomAmount={setCustomAmount} setAmount={setAmount}
              paymentMethod={paymentMethod}
              selectedAmount={selectedAmount}
              submitting={submitting}
              error={error}
              handleSubmit={handleSubmit}
              handleCopy={handleCopy}
              bankAccounts={bankAccounts}
              selectedBankId={selectedBankId} setSelectedBankId={setSelectedBankId}
              selectedBankAccount={selectedBankAccount}
              bankTransferStep={bankTransferStep}
              bankConfigLoading={bankConfigLoading}
              bankConfigError={bankConfigError}
              reference={reference}
              goToReferencePage={goToReferencePage}
            />
          )}

          {paymentMethod === 'crypto' && (
            <CryptoFlow
              donorName={donorName} setDonorName={setDonorName}
              donorEmail={donorEmail} setDonorEmail={setDonorEmail}
              donorPhone={donorPhone} setDonorPhone={setDonorPhone}
              message={message} setMessage={setMessage}
              customAmount={customAmount} setCustomAmount={setCustomAmount} setAmount={setAmount}
              paymentMethod={paymentMethod}
              selectedAmount={selectedAmount}
              submitting={submitting}
              error={error}
              handleSubmit={handleSubmit}
              handleCopy={handleCopy}
              ethAddress={ethAddress}
              btcAddress={btcAddress}
              txHash={txHash} setTxHash={setTxHash}
              cryptoStep={cryptoStep} setCryptoStep={setCryptoStep}
              verifying={verifying}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default GivingModal
