import { FUNDS, NGN_PRESETS, CRYPTO_PRESETS } from './useGivingFlow'

export function FundSelector({
  fund,
  setFund,
  selectedAmount,
  customAmount,
  setCustomAmount,
  setAmount,
  paymentMethod,
  handlePresetClick
}) {
  const currentPresets = paymentMethod === 'crypto' ? CRYPTO_PRESETS : NGN_PRESETS
  const paymentLabel = paymentMethod === 'crypto' ? 'USDT' : 'NGN'

  return (
    <>
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
        <span className="giving-modal__quick-title">Quick Amount ({paymentLabel})</span>
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
    </>
  )
}

export default FundSelector
