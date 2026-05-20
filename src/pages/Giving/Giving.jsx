import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { Button } from '../../components/common'
import { GivingModal } from '../../components/features'
import { confirmGiving } from '../../utils/givingApi'
import './Giving.css'

const formatCurrency = (amount, currency = 'NGN') => {
  const value = Number(amount)
  if (!Number.isFinite(value)) return '--'
  if (currency === 'USDT') return `$${value.toLocaleString()} USDT`
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 2 }).format(value)
}

const Giving = () => {
  const [searchParams] = useSearchParams()
  const queryReference = String(searchParams.get('reference') || searchParams.get('trxref') || '').trim()

  const [confirming, setConfirming] = useState(false)
  const [confirmation, setConfirmation] = useState(null)
  const [error, setError] = useState('')
  const [showGiving, setShowGiving] = useState(false)

  useEffect(() => {
    if (!queryReference) return

    let active = true
    setConfirming(true)
    setError('')
    confirmGiving({ reference: queryReference })
      .then((result) => {
        if (!active) return
        setConfirmation(result?.data || null)
      })
      .catch((err) => {
        if (!active) return
        setError(err?.message || 'Unable to confirm payment status right now.')
      })
      .finally(() => {
        if (!active) return
        setConfirming(false)
      })

    return () => { active = false }
  }, [queryReference])

  return (
    <main id="main-content" className="giving-page">
      <Helmet>
        <title>Give — FGC Upper Room Mgbuoba</title>
        <meta name="description" content="Support the ministry of FGC Upper Room Mgbuoba through your tithes and offerings. Give securely online." />
        <meta property="og:title" content="Give — FGC Upper Room Mgbuoba" />
        <meta property="og:description" content="Partner with God's work at Upper Room Mgbuoba through your generous giving." />
        <meta property="og:image" content="https://fgcmgbuoba.org/fgc-testing/assets/media/pictures/IMG_1769.webp" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://fgcmgbuoba.org/fgc-testing/giving" />
      </Helmet>
      <section className="giving-page__hero">
        <div className="container giving-page__hero-inner">
          <p className="giving-page__eyebrow">Online Giving</p>
          <h1>Support the mission</h1>
          <p>
            Support the ministry through tithes, offerings, building projects, and welfare giving.
            Transactions are secured via Paystack or processed through Crypto payments.
          </p>
        </div>
      </section>

      <section className="giving-page__section">
        <div className="container">
          {/* Receipt / confirmation — only shows when returning from Paystack */}
          {queryReference ? (
            <div className="giving-page__receipt-wrap">
              <h2>Payment Status</h2>

              {confirming && <p className="giving-page__status">Checking transaction status…</p>}
              {error && !confirming && <p className="giving-page__status giving-page__status--error">{error}</p>}

              {!confirming && confirmation && (
                <div className={`giving-page__confirmation giving-page__confirmation--${confirmation.status}`}>
                  <div className="giving-page__confirmation-icon">
                    {confirmation.status === 'success'
                      ? <i className="fa-solid fa-circle-check" aria-hidden="true" />
                      : <i className="fa-solid fa-circle-xmark" aria-hidden="true" />}
                  </div>
                  <p className="giving-page__confirmation-title">
                    {confirmation.status === 'success' ? 'Payment Successful' : confirmation.status?.toUpperCase()}
                  </p>
                  <p className="giving-page__confirmation-amount">{formatCurrency(confirmation.amountNaira, confirmation.currency)}</p>
                  <dl className="giving-page__confirmation-dl">
                    <div><dt>Reference</dt><dd>{confirmation.reference}</dd></div>
                    <div><dt>Fund</dt><dd>{String(confirmation.fund || '').replace(/-/g, ' ')}</dd></div>
                    <div><dt>Name</dt><dd>{confirmation.donorName}</dd></div>
                    <div><dt>Updated</dt><dd>{new Date(confirmation.updatedAt).toLocaleString()}</dd></div>
                  </dl>
                  {confirmation.status === 'success' && (
                    <p className="giving-page__confirmation-thanks">
                      Thank you for giving! Your generosity is greatly appreciated.
                    </p>
                  )}
                  {confirmation.providerMessage && (
                    <p className="giving-page__status">{confirmation.providerMessage}</p>
                  )}
                  <div className="giving-page__receipt-actions">
                    <Button href="/" variant="outline" size="md">Back to Home</Button>
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => window.print()}
                    >
                      <i className="fa-solid fa-print" aria-hidden="true" style={{ marginRight: '0.4em' }} />
                      Print Receipt
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* No reference — invite the user to give via the modal */
            <div className="giving-page__cta-wrap">
              <div className="giving-page__cta-icon">
                <i className="fa-solid fa-hand-holding-heart" aria-hidden="true" />
              </div>
              <h2>Ready to Give?</h2>
              <p>
                Choose a fund, enter your amount, and proceed to checkout via Paystack or Crypto in seconds.
                Your giving supports weekly ministry, building projects, and welfare work.
              </p>
              <Button variant="primary" size="lg" onClick={() => setShowGiving(true)}>
                Give Now
              </Button>
            </div>
          )}
        </div>
      </section>

      <GivingModal
        isOpen={showGiving}
        onClose={() => setShowGiving(false)}
        defaultFund="general"
        ctaRef="giving-page"
      />
    </main>
  )
}

export default Giving
