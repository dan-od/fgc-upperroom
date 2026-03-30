import { useEffect, useRef, useState, useMemo } from 'react'
import { Button, useFeedback } from '../../common'
import { abandonGiving, confirmGiving, initializeGiving } from '../../../utils/givingApi'
import { trackRumEvent } from '../../../utils/rum'
import { toApiUrl, toAppUrl } from '../../../utils/appPaths'
import './GivingModal.css'

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || ''

const FUNDS = [
  { value: 'general', label: 'General Giving', description: 'Weekly ministry & operations.' },
  { value: 'tithe', label: 'Tithe', description: 'Regular tithe giving.' },
  { value: 'sunday-offering', label: 'Sunday Offering', description: 'Sunday worship & thanksgiving.' },
  { value: 'building', label: 'Building Project', description: 'Infrastructure & expansion.' },
  { value: 'welfare', label: 'Welfare', description: 'Member-care & benevolence.' }
]

const NGN_PRESETS = [500, 1000, 3000, 5000, 10000, 20000, 50000, 100000]
const CRYPTO_PRESETS = [5, 10, 20, 50, 100] // USDT values
const DEFAULT_NGN_AMOUNT = 5000
const DEFAULT_CRYPTO_AMOUNT = CRYPTO_PRESETS[1]

const formatCurrency = (amount, method = 'paystack') => {
  const value = Number(amount)
  if (!Number.isFinite(value)) return '--'
  if (method === 'crypto') return `$${value.toLocaleString()} USDT`
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value)
}

const normalizeBankDetails = (details) => {
  if (Array.isArray(details)) {
    return details
      .map((item) => ({
        label: String(item?.label || '').trim(),
        value: String(item?.value || '').trim()
      }))
      .filter((item) => item.label && item.value)
  }

  if (details && typeof details === 'object') {
    return Object.entries(details)
      .map(([label, value]) => ({
        label: String(label || '').trim(),
        value: String(value || '').trim()
      }))
      .filter((item) => item.label && item.value)
  }

  return []
}

const normalizeBankAccount = (bank, index = 0) => {
  const bankName = String(bank?.bankName || bank?.name || '').trim()
  const accountName = String(bank?.accountName || '').trim()
  const accountNumber = String(bank?.accountNumber || '').trim()

  if (!bankName || !accountName || !accountNumber) {
    return null
  }

  return {
    id: String(bank?.id || `bank-${index + 1}`).trim(),
    bankName,
    accountName,
    accountNumber,
    instructions: String(bank?.instructions || bank?.transferInstructions || '').trim(),
    details: normalizeBankDetails(bank?.details)
  }
}

const normalizeBankAccounts = (payload) => {
  if (Array.isArray(payload?.bankAccounts)) {
    return payload.bankAccounts
      .map((bank, index) => normalizeBankAccount(bank, index))
      .filter(Boolean)
  }

  const fallback = normalizeBankAccount({
    id: 'default-bank',
    bankName: payload?.bankName,
    accountName: payload?.accountName,
    accountNumber: payload?.accountNumber,
    transferInstructions: payload?.transferInstructions,
    details: payload?.details
  })

  return fallback ? [fallback] : []
}

export const GivingModal = ({ isOpen, onClose, defaultFund = 'general', ctaRef = '' }) => {
  const panelRef = useRef(null)
  const closeRef = useRef(null)
  const { showError, showSuccess } = useFeedback()

  const [fund, setFund] = useState(defaultFund)
  const [amount, setAmount] = useState(DEFAULT_NGN_AMOUNT)
  const [customAmount, setCustomAmount] = useState('')
  const [donorName, setDonorName] = useState('')
  const [donorEmail, setDonorEmail] = useState('')
  const [donorPhone, setDonorPhone] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('paystack')
  const [reference, setReference] = useState('')
  const [ethAddress, setEthAddress] = useState('')
  const [btcAddress, setBtcAddress] = useState('')
  const [bankConfigLoading, setBankConfigLoading] = useState(false)
  const [bankConfigError, setBankConfigError] = useState('')
  const [bankAccounts, setBankAccounts] = useState([])
  const [selectedBankId, setSelectedBankId] = useState('')
  const [bankTransferStep, setBankTransferStep] = useState('form')
  const [txHash, setTxHash] = useState('')
  const [cryptoStep, setCryptoStep] = useState('form')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState('')

  // Sync fund when modal opens with a new defaultFund
  useEffect(() => {
    if (isOpen) {
      setFund(defaultFund)
      setPaymentMethod('paystack')
      setCryptoStep('form')
      setBankTransferStep('form')
      setReference('')
      setEthAddress('')
      setBtcAddress('')
      setBankConfigLoading(true)
      setBankConfigError('')
      setBankAccounts([])
      setSelectedBankId('')
      setTxHash('')
      setError('')
      setCustomAmount('')
      setAmount(DEFAULT_NGN_AMOUNT)

      fetch(toApiUrl('/api/giving/config'))
        .then(async (response) => {
          const data = await response.json().catch(() => ({}))
          if (!response.ok || !data?.ok) {
            throw new Error(data?.error || 'Unable to load bank transfer details right now.')
          }
          return data
        })
        .then(data => {
          setEthAddress(data.ethereumAddress || '')
          setBtcAddress(data.bitcoinAddress || '')
          const nextBankAccounts = normalizeBankAccounts(data)
          setBankAccounts(nextBankAccounts)
          setSelectedBankId((current) => {
            if (current && nextBankAccounts.some((item) => item.id === current)) {
              return current
            }
            return nextBankAccounts[0]?.id || ''
          })
        })
        .catch((err) => {
          setBankAccounts([])
          setSelectedBankId('')
          setBankConfigError(err?.message || 'Unable to load bank transfer details right now.')
        })
        .finally(() => setBankConfigLoading(false))
    }
  }, [isOpen, defaultFund])

  // Sync default amount when payment method changes
  useEffect(() => {
    if (!isOpen) return
    setAmount(paymentMethod === 'crypto' ? DEFAULT_CRYPTO_AMOUNT : DEFAULT_NGN_AMOUNT)
    setCustomAmount('')
    setError('')
    setReference('')
    setTxHash('')
    setCryptoStep('form')
    setBankTransferStep('form')
  }, [paymentMethod, isOpen])

  // Focus trap + keyboard nav
  useEffect(() => {
    if (!isOpen) {
      document.body.classList.remove('modal-open')
      return
    }

    document.body.classList.add('modal-open')
    const focusTimer = window.setTimeout(() => {
      closeRef.current?.focus()
    }, 40)

    const handleKeydown = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const panel = panelRef.current
      if (!panel) return
      const focusable = panel.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      if (!focusable.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus()
      }
    }

    document.addEventListener('keydown', handleKeydown)
    return () => {
      window.clearTimeout(focusTimer)
      document.body.classList.remove('modal-open')
      document.removeEventListener('keydown', handleKeydown)
    }
  }, [isOpen, onClose])

  const selectedAmount = useMemo(() => {
    const val = Number(customAmount || amount)
    return isNaN(val) ? 0 : val
  }, [amount, customAmount])

  const currentPresets = useMemo(() => {
    return paymentMethod === 'crypto' ? CRYPTO_PRESETS : NGN_PRESETS
  }, [paymentMethod])

  const paymentLabel = paymentMethod === 'crypto' ? 'USDT' : 'NGN'
  const isBankTransfer = paymentMethod === 'bank-transfer'
  const selectedBankAccount = useMemo(() => {
    return bankAccounts.find((item) => item.id === selectedBankId) || bankAccounts[0] || null
  }, [bankAccounts, selectedBankId])
  const bankDetailsReady = Boolean(selectedBankAccount)
  const source = fund === 'sunday-offering' ? 'hero-giving-modal-sunday' : 'hero-giving-modal'
  const isBankTransferReadyState = isBankTransfer && bankTransferStep === 'details'
  const goToReferencePage = () => {
    if (!reference) return
    window.location.href = toAppUrl(`giving?reference=${encodeURIComponent(reference)}`)
  }

  const handlePresetClick = (val) => {
    setAmount(val)
    setCustomAmount(String(val)) // User wants custom amount to sync with quick amount
  }

  const handleCopy = (text) => {
    if (!text) return
    const doCopy = (val) => {
      const el = document.createElement('textarea')
      el.value = val
      el.setAttribute('readonly', '')
      el.style.position = 'absolute'
      el.style.left = '-9999px'
      document.body.appendChild(el)
      el.select()
      const success = document.execCommand('copy')
      document.body.removeChild(el)
      return success
    }

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text)
        .then(() => showSuccess('Copied to clipboard.', { title: 'Copied' }))
        .catch(() => {
          if (doCopy(text)) {
            showSuccess('Copied to clipboard.', { title: 'Copied' })
            return
          }
          showError('We could not copy that yet. Please try again.', { title: 'Copy failed' })
        })
    } else {
      if (doCopy(text)) {
        showSuccess('Copied to clipboard.', { title: 'Copied' })
        return
      }
      showError('We could not copy that yet. Please try again.', { title: 'Copy failed' })
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    let pendingPaystackReference = ''

    try {
      if (paymentMethod === 'crypto' && cryptoStep === 'form') {
        const payload = await initializeGiving({
          fund,
          donorName,
          donorEmail,
          donorPhone,
          amount: selectedAmount,
          message,
          source: fund === 'sunday-offering' ? 'hero-giving-modal-sunday' : 'hero-giving-modal',
          ctaRef,
          paymentMethod: 'crypto', // kept for legacy if needed
          provider: 'crypto'
        })
        setReference(payload.reference)
        setEthAddress(payload.ethereumAddress || payload.walletAddress)
        setBtcAddress(payload.bitcoinAddress)
        setCryptoStep('verification')
        setSubmitting(false)
        return
      }

      if (paymentMethod === 'bank-transfer' && bankTransferStep === 'form') {
        const payload = await initializeGiving({
          fund,
          donorName,
          donorEmail,
          donorPhone,
          amount: selectedAmount,
          message,
          source,
          ctaRef,
          paymentMethod: 'bank-transfer',
          provider: 'bank_transfer',
          bankAccountId: selectedBankAccount?.id || ''
        })

        setReference(payload.reference || '')
        const nextBankAccounts = normalizeBankAccounts(payload)
        if (nextBankAccounts.length) {
          setBankAccounts(nextBankAccounts)
        }
        if (payload.bankAccountId) {
          setSelectedBankId(String(payload.bankAccountId))
        }
        setBankTransferStep('details')

        if (fund === 'sunday-offering') {
          trackRumEvent({ metric: 'SUNDAY_OFFERING_INITIALIZED', value: 1, source: 'hero-giving-modal' })
        }

        setSubmitting(false)
        return
      }

      if (paymentMethod === 'crypto' && cryptoStep === 'verification') {
        if (!txHash) {
          setError('Please provide your transaction hash.')
          setSubmitting(false)
          return
        }
        setVerifying(true)
        const response = await fetch(toApiUrl('/api/giving/verify-crypto'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ reference, txHash })
        })
      const result = await response.json()
      if (result.ok) {
        // Success! Proceed to receipt page
        window.location.href = toAppUrl(`giving?reference=${reference}`)
        return
      }
        throw new Error(result.error || 'Verification failed.')
      }

      const payload = await initializeGiving({
        fund,
        donorName,
        donorEmail,
        donorPhone,
        amount: selectedAmount,
        message,
        source,
        ctaRef,
        provider: 'paystack'
      })
      pendingPaystackReference = String(payload?.reference || '').trim()

      if (fund === 'sunday-offering') {
        trackRumEvent({ metric: 'SUNDAY_OFFERING_INITIALIZED', value: 1, source: 'hero-giving-modal' })
      }

      if (!payload?.reference) {
        throw new Error('Payment reference is missing.')
      }

      // Prefer Paystack Inline JS popup (user stays on your site).
      const publicKey = payload?.publicKey || PAYSTACK_PUBLIC_KEY
      const PaystackPop = window.PaystackPop

      if (PaystackPop && publicKey && payload.reference) {
        setSubmitting(false) // Release button — popup takes over
        let checkoutSettled = false

        const finalizePaystackCheckout = async (referenceToConfirm) => {
          const ref = String(referenceToConfirm || payload.reference || '').trim()
          if (!ref) {
            throw new Error('Payment reference is missing.')
          }

          try {
            await confirmGiving({ reference: ref })
          } catch {
            // Best-effort verification. If Paystack verification is briefly unavailable,
            // still send the donor to the receipt page where confirmation can retry.
          }

          onClose()
          window.location.href = toAppUrl(`giving?reference=${encodeURIComponent(ref)}`)
        }

        const abandonPaystackCheckout = async (providerMessage) => {
          const ref = String(payload.reference || '').trim()
          if (!ref) {
            return
          }

          try {
            await abandonGiving({
              reference: ref,
              providerMessage
            })
          } catch {
            // Best-effort status cleanup.
          }
        }

        function handlePaystackSuccess(transaction) {
          checkoutSettled = true
          const ref = transaction?.reference || payload.reference
          void finalizePaystackCheckout(ref)
        }

        function handlePaystackCancel() {
          if (checkoutSettled) {
            return
          }

          void (async () => {
            try {
              const result = await confirmGiving({ reference: payload.reference })
              if (result?.data?.status === 'success') {
                checkoutSettled = true
                await finalizePaystackCheckout(payload.reference)
                return
              }
            } catch {
              // Ignore and show the cancellation state below.
            }

            await abandonPaystackCheckout('Payment was cancelled before completion.')

            // User closed the popup before the payment was confirmed.
            setError('Payment was cancelled. You can try again.')
          })()
        }

        function handlePaystackError(error) {
          if (checkoutSettled) {
            return
          }

          void (async () => {
            await abandonPaystackCheckout(
              String(error?.message || error?.msg || 'Payment popup failed before checkout could continue.').trim()
            )
            setError(String(error?.message || error?.msg || 'Could not open Paystack right now. Please try again.').trim())
          })()
        }

        const popup = new PaystackPop()
        popup.newTransaction({
          key: publicKey,
          email: donorEmail,
          amount: Math.round(selectedAmount * 100),
          currency: 'NGN',
          reference: payload.reference,
          metadata: {
            donorName,
            donorPhone,
            fund,
            ctaRef,
            callbackUrl: payload.callbackUrl || '',
            custom_fields: [
              { display_name: 'Fund', variable_name: 'fund', value: fund },
              { display_name: 'Name', variable_name: 'donor_name', value: donorName },
            ],
          },
          onSuccess: handlePaystackSuccess,
          onCancel: handlePaystackCancel,
          onError: handlePaystackError,
        })
        return
      }

      throw new Error('Paystack checkout failed to load. Please refresh and try again.')
    } catch (err) {
      if (paymentMethod === 'paystack' && pendingPaystackReference) {
        try {
          await abandonGiving({
            reference: pendingPaystackReference,
            providerMessage: 'Payment popup failed before checkout could continue.'
          })
        } catch {
          // Best-effort status cleanup.
        }
      }
      setError(err?.message || 'Unable to initialize payment right now.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

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
        {/* ── Verification Overlay (Mini-Modal) ── */}
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
                  <button 
                    type="button" 
                    className="giving-modal__copy-btn"
                    onClick={() => handleCopy(ethAddress)}
                    title="Copy Address"
                  >
                    <i className="fa-solid fa-copy" />
                  </button>
                </div>
              </div>

              <div className="giving-modal__verify-form">
                <div className="giving-modal__input-group">
                  <label htmlFor="txHash">Transaction Hash (TxID)</label>
                  <input
                    id="txHash"
                    type="text"
                    required
                    placeholder="0x..."
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                  />
                </div>
                
                {verifying && (
                  <div className="giving-modal__loading-container">
                    <div className="giving-modal__loading-line" />
                    <small>On-chain verification in progress...</small>
                  </div>
                )}

                <div className="giving-modal__verification-actions">
                  <button 
                    type="button" 
                    className="giving-modal__back-btn" 
                    onClick={() => setCryptoStep('form')}
                    disabled={verifying}
                  >
                    <i className="fa-solid fa-arrow-left" /> Go Back
                  </button>
                  <Button 
                    variant="primary" 
                    onClick={handleSubmit} 
                    disabled={verifying || !txHash}
                    className="giving-modal__verify-btn"
                  >
                    {verifying ? 'Verifying...' : 'Verify Now'}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── LEFT PANEL ── dark: close + header + fund + amounts */}
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
            <p>
              {paymentMethod === 'bank-transfer'
                ? 'Generate a transfer reference, then send the exact amount to the church account below.'
                : paymentMethod === 'paystack'
                ? 'Secure checkout via Paystack. A secure checkout window will open here to complete payment.'
                : 'Support the mission using USDT or Bitcoin. Transfer to the wallets below.'}
            </p>
          </div>

          {/* Fund selector */}
          <div className="giving-modal__fund-grid">
            {FUNDS.map((f) => (
              <button
                key={f.value}
                type="button"
                className={`giving-modal__fund-btn${fund === f.value ? ' is-active' : ''}`}
                onClick={() => setFund(f.value)}
              >
                <strong>{f.label}</strong>
                <small>{f.description}</small>
              </button>
            ))}
          </div>

          {/* Amount presets */}
          <div className="giving-modal__quick-amounts">
            <span className="giving-modal__quick-title">Quick Amount ({paymentMethod === 'crypto' ? 'USDT' : 'NGN'})</span>
            <div className="giving-modal__presets">
              {currentPresets.map((val) => (
                <button
                  key={val}
                  type="button"
                  className={`giving-modal__preset${selectedAmount === val ? ' is-active' : ''}`}
                  onClick={() => handlePresetClick(val)}
                >
                  {paymentMethod === 'crypto' ? `$${val}` : `₦${val.toLocaleString()}`}
                </button>
              ))}
            </div>
          </div>
        </div>

          {/* ── RIGHT PANEL ── white: form fields + submit */}
          <div className="giving-modal__right">
          {cryptoStep === 'form' && bankTransferStep === 'form' && (
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

          <form className="giving-modal__form" onSubmit={handleSubmit}>
            <label className="giving-modal__label">
              <span>Custom Amount ({paymentLabel})</span>
              <input
                type="number"
                min={paymentMethod === 'crypto' ? '5' : '100'}
                step={paymentMethod === 'crypto' ? '0.01' : '1'}
                placeholder="Enter custom amount"
                value={customAmount}
                onChange={(e) => {
                  setCustomAmount(e.target.value)
                  setAmount(0)
                }}
              />
            </label>

            {paymentMethod === 'bank-transfer' && bankTransferStep === 'form' && (
              <div className="giving-modal__bank-info">
                {bankConfigLoading ? (
                  <p className="giving-modal__bank-loading">
                    Loading bank transfer details...
                  </p>
                ) : bankDetailsReady ? (
                  <>
                    {bankAccounts.length > 1 ? (
                      <div className="giving-modal__bank-selector">
                        <span>Choose Bank</span>
                        <div className="giving-modal__bank-toggle" aria-label="Choose bank">
                          {bankAccounts.map((bank) => (
                            <button
                              key={bank.id}
                              type="button"
                              aria-pressed={selectedBankAccount?.id === bank.id}
                              className={`giving-modal__bank-toggle-btn${selectedBankAccount?.id === bank.id ? ' is-active' : ''}`}
                              onClick={() => setSelectedBankId(bank.id)}
                            >
                              <strong>{bank.bankName}</strong>
                              <small>{bank.accountNumber}</small>
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <div className="giving-modal__bank-item">
                      <span>Bank Name</span>
                      <input type="text" readOnly value={selectedBankAccount?.bankName || ''} />
                    </div>
                    <div className="giving-modal__bank-item">
                      <span>Account Name</span>
                      <input type="text" readOnly value={selectedBankAccount?.accountName || ''} />
                    </div>
                    <div className="giving-modal__bank-item">
                      <span>Account Number</span>
                      <div className="giving-modal__copy-field">
                        <input type="text" readOnly value={selectedBankAccount?.accountNumber || ''} />
                        <button
                          type="button"
                          className="giving-modal__copy-btn"
                          onClick={() => handleCopy(selectedBankAccount?.accountNumber)}
                          title="Copy Account Number"
                        >
                          <i className="fa-solid fa-copy" />
                        </button>
                      </div>
                    </div>
                    {selectedBankAccount?.details?.map((detail) => (
                      <div className="giving-modal__bank-item" key={`${detail.label}:${detail.value}`}>
                        <span>{detail.label}</span>
                        <input type="text" readOnly value={detail.value} />
                      </div>
                    ))}
                    <small className="giving-modal__crypto-note">
                      Fill the form to generate your transfer reference before sending payment.
                    </small>
                    {selectedBankAccount?.instructions ? (
                      <p className="giving-modal__bank-note">{selectedBankAccount.instructions}</p>
                    ) : null}
                  </>
                ) : bankConfigError ? (
                  <p className="giving-modal__bank-unavailable">
                    {bankConfigError}
                  </p>
                ) : (
                  <p className="giving-modal__bank-unavailable">
                    Bank transfer details are not configured yet. Please use Paystack or Crypto for now.
                  </p>
                )}
              </div>
            )}

            <div className="giving-modal__row">
              <label className="giving-modal__label">
                <span>Full Name <span aria-hidden="true">*</span></span>
                <input
                  type="text"
                  required
                  minLength={2}
                  autoComplete="name"
                  value={donorName}
                  onChange={(e) => setDonorName(e.target.value)}
                />
              </label>

              <label className="giving-modal__label">
                <span>Email Address <span aria-hidden="true">*</span></span>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={donorEmail}
                  onChange={(e) => setDonorEmail(e.target.value)}
                />
              </label>
            </div>

            <label className="giving-modal__label">
              <span>Phone Number</span>
              <input
                type="tel"
                autoComplete="tel"
                value={donorPhone}
                onChange={(e) => setDonorPhone(e.target.value)}
              />
            </label>

            <label className="giving-modal__label">
              <span>Message (Optional)</span>
              <textarea
                rows={2}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </label>

            {paymentMethod === 'crypto' && cryptoStep === 'form' && (
              <div className="giving-modal__crypto-info">
                <div className="giving-modal__crypto-item">
                  <span>USDT (ERC20/TRC20):</span>
                  <div className="giving-modal__copy-field">
                    <input 
                      type="text" 
                      readOnly 
                      value={ethAddress || 'Fetching address...'} 
                    />
                    <button 
                      type="button" 
                      className="giving-modal__copy-btn"
                      onClick={() => handleCopy(ethAddress)}
                      title="Copy Address"
                      disabled={!ethAddress}
                    >
                      <i className="fa-solid fa-copy" />
                    </button>
                  </div>
                </div>
                <div className="giving-modal__crypto-item">
                  <span>BITCOIN (BTC):</span>
                  <div className="giving-modal__copy-field">
                    <input 
                      type="text" 
                      readOnly 
                      value={btcAddress || 'Contact Admin for Wallet'} 
                    />
                    {btcAddress && (
                      <button 
                        type="button" 
                        className="giving-modal__copy-btn"
                        onClick={() => handleCopy(btcAddress)}
                        title="Copy Address"
                      >
                        <i className="fa-solid fa-copy" />
                      </button>
                    )}
                  </div>
                </div>
                <small className="giving-modal__crypto-note">
                  Please complete the form so we can track your giving.
                </small>
              </div>
            )}

            {isBankTransferReadyState && (
              <div className="giving-modal__bank-info">
                <div className="giving-modal__bank-item">
                  <span>Amount to Transfer</span>
                  <input type="text" readOnly value={formatCurrency(selectedAmount, paymentMethod)} />
                </div>
                <div className="giving-modal__bank-item">
                  <span>Bank Name</span>
                  <input type="text" readOnly value={selectedBankAccount?.bankName || ''} />
                </div>
                <div className="giving-modal__bank-item">
                  <span>Account Name</span>
                  <input type="text" readOnly value={selectedBankAccount?.accountName || ''} />
                </div>
                <div className="giving-modal__bank-item">
                  <span>Account Number</span>
                  <div className="giving-modal__copy-field">
                    <input type="text" readOnly value={selectedBankAccount?.accountNumber || ''} />
                    <button
                      type="button"
                      className="giving-modal__copy-btn"
                      onClick={() => handleCopy(selectedBankAccount?.accountNumber)}
                      title="Copy Account Number"
                    >
                      <i className="fa-solid fa-copy" />
                    </button>
                  </div>
                </div>
                {selectedBankAccount?.details?.map((detail) => (
                  <div className="giving-modal__bank-item" key={`confirmed:${detail.label}:${detail.value}`}>
                    <span>{detail.label}</span>
                    <input type="text" readOnly value={detail.value} />
                  </div>
                ))}
                <div className="giving-modal__bank-item">
                  <span>Transfer Reference</span>
                  <div className="giving-modal__copy-field">
                    <input type="text" readOnly value={reference || 'Generating reference...'} />
                    <button
                      type="button"
                      className="giving-modal__copy-btn"
                      onClick={() => handleCopy(reference)}
                      title="Copy Reference"
                      disabled={!reference}
                    >
                      <i className="fa-solid fa-copy" />
                    </button>
                  </div>
                </div>
                <small className="giving-modal__crypto-note">
                  Use this reference as your narration so the transfer can be matched quickly.
                </small>
                {selectedBankAccount?.instructions ? (
                  <p className="giving-modal__bank-note">{selectedBankAccount.instructions}</p>
                ) : null}
              </div>
            )}

            {error ? <p className="giving-modal__error" role="alert">{error}</p> : null}

            <div className="giving-modal__footer">
              <div className="giving-modal__total">
                <small>Total</small>
                <strong>{formatCurrency(selectedAmount, paymentMethod)}</strong>
              </div>
              {isBankTransferReadyState ? (
                <Button type="button" variant="primary" size="md" onClick={goToReferencePage}>
                  View Reference Page →
                </Button>
              ) : (
                <Button
                  type="submit"
                  variant="primary"
                  size="md"
                  disabled={submitting || verifying || (paymentMethod === 'bank-transfer' && (!bankDetailsReady || bankConfigLoading))}
                >
                  {submitting || verifying
                    ? (paymentMethod === 'paystack' ? 'Opening Paystack…' : 'Processing…')
                    : paymentMethod === 'bank-transfer'
                      ? 'Generate Transfer Reference →'
                      : paymentMethod === 'paystack'
                        ? 'Pay with Paystack →'
                        : 'Verify Payment →'}
                </Button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default GivingModal
