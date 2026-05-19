import { useEffect, useRef, useMemo, useState } from 'react'
import { useFeedback } from '../../common'
import { abandonGiving, confirmGiving, initializeGiving } from '../../../utils/givingApi'
import { trackRumEvent } from '../../../utils/rum'
import { toApiUrl, toAppUrl } from '../../../utils/appPaths'

const PAYSTACK_PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || ''
export const FUNDS = [
  { value: 'general', label: 'General Giving', description: 'Weekly ministry & operations.' },
  { value: 'tithe', label: 'Tithe', description: 'Regular tithe giving.' },
  { value: 'sunday-offering', label: 'Sunday Offering', description: 'Sunday worship & thanksgiving.' },
  { value: 'building', label: 'Building Project', description: 'Infrastructure & expansion.' },
  { value: 'welfare', label: 'Welfare', description: 'Member-care & benevolence.' }
]
export const NGN_PRESETS = [500, 1000, 3000, 5000, 10000, 20000, 50000, 100000]
export const CRYPTO_PRESETS = [5, 10, 20, 50, 100]
const DEFAULT_NGN_AMOUNT = 5000
const DEFAULT_CRYPTO_AMOUNT = CRYPTO_PRESETS[1]
export const formatCurrency = (amount, method = 'paystack') => {
  const value = Number(amount)
  if (!Number.isFinite(value)) return '--'
  if (method === 'crypto') return `$${value.toLocaleString()} USDT`
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value)
}
const normalizeBankDetails = (details) => {
  const toRow = (label, value) => ({ label: String(label || '').trim(), value: String(value || '').trim() })
  const valid = (r) => r.label && r.value
  if (Array.isArray(details)) return details.map((i) => toRow(i?.label, i?.value)).filter(valid)
  if (details && typeof details === 'object') return Object.entries(details).map(([l, v]) => toRow(l, v)).filter(valid)
  return []
}
const normalizeBankAccount = (bank, index = 0) => {
  const bankName = String(bank?.bankName || bank?.name || '').trim()
  const accountName = String(bank?.accountName || '').trim()
  const accountNumber = String(bank?.accountNumber || '').trim()
  if (!bankName || !accountName || !accountNumber) return null
  return {
    id: String(bank?.id || `bank-${index + 1}`).trim(), bankName, accountName, accountNumber,
    instructions: String(bank?.instructions || bank?.transferInstructions || '').trim(),
    details: normalizeBankDetails(bank?.details)
  }
}
export const normalizeBankAccounts = (payload) => {
  if (Array.isArray(payload?.bankAccounts))
    return payload.bankAccounts.map((b, i) => normalizeBankAccount(b, i)).filter(Boolean)
  const fallback = normalizeBankAccount({
    id: 'default-bank', bankName: payload?.bankName, accountName: payload?.accountName,
    accountNumber: payload?.accountNumber, transferInstructions: payload?.transferInstructions,
    details: payload?.details
  })
  return fallback ? [fallback] : []
}

export function useGivingFlow({ isOpen, onClose, defaultFund = 'general', ctaRef = '' }) {
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

  useEffect(() => {
    if (!isOpen) return
    setFund(defaultFund); setPaymentMethod('paystack'); setCryptoStep('form')
    setBankTransferStep('form'); setReference(''); setEthAddress(''); setBtcAddress('')
    setBankConfigLoading(true); setBankConfigError(''); setBankAccounts([])
    setSelectedBankId(''); setTxHash(''); setError(''); setCustomAmount(''); setAmount(DEFAULT_NGN_AMOUNT)
    fetch(toApiUrl('/api/giving/config'))
      .then(async (res) => { const d = await res.json().catch(() => ({})); if (!res.ok || !d?.ok) throw new Error(d?.error || 'Unable to load bank transfer details right now.'); return d })
      .then((data) => {
        setEthAddress(data.ethereumAddress || ''); setBtcAddress(data.bitcoinAddress || '')
        const next = normalizeBankAccounts(data)
        setBankAccounts(next)
        setSelectedBankId((cur) => (cur && next.some((i) => i.id === cur) ? cur : next[0]?.id || ''))
      })
      .catch((err) => { setBankAccounts([]); setSelectedBankId(''); setBankConfigError(err?.message || 'Unable to load bank transfer details right now.') })
      .finally(() => setBankConfigLoading(false))
  }, [isOpen, defaultFund])

  useEffect(() => {
    if (!isOpen) return
    setAmount(paymentMethod === 'crypto' ? DEFAULT_CRYPTO_AMOUNT : DEFAULT_NGN_AMOUNT)
    setCustomAmount(''); setError(''); setReference(''); setTxHash(''); setCryptoStep('form'); setBankTransferStep('form')
  }, [paymentMethod, isOpen])

  useEffect(() => {
    if (!isOpen) { document.body.classList.remove('modal-open'); return }
    document.body.classList.add('modal-open')
    const t = window.setTimeout(() => closeRef.current?.focus(), 40)
    const onKey = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab') return
      const panel = panelRef.current; if (!panel) return
      const els = panel.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')
      if (!els.length) return
      const first = els[0], last = els[els.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { window.clearTimeout(t); document.body.classList.remove('modal-open'); document.removeEventListener('keydown', onKey) }
  }, [isOpen, onClose])

  const selectedAmount = useMemo(() => { const v = Number(customAmount || amount); return isNaN(v) ? 0 : v }, [amount, customAmount])
  const selectedBankAccount = useMemo(() => bankAccounts.find((i) => i.id === selectedBankId) || bankAccounts[0] || null, [bankAccounts, selectedBankId])

  const handleCopy = (text) => {
    if (!text) return
    const fallback = (val) => { const el = Object.assign(document.createElement('textarea'), { value: val }); el.setAttribute('readonly',''); Object.assign(el.style,{position:'absolute',left:'-9999px'}); document.body.appendChild(el); el.select(); const ok = document.execCommand('copy'); document.body.removeChild(el); return ok }
    const ok = () => showSuccess('Copied to clipboard.', { title: 'Copied' })
    const fail = () => showError('We could not copy that yet. Please try again.', { title: 'Copy failed' })
    if (navigator.clipboard) navigator.clipboard.writeText(text).then(ok).catch(() => (fallback(text) ? ok() : fail()))
    else (fallback(text) ? ok() : fail())
  }

  const handlePresetClick = (val) => { setAmount(val); setCustomAmount(String(val)) }
  const source = fund === 'sunday-offering' ? 'hero-giving-modal-sunday' : 'hero-giving-modal'
  const goToReferencePage = () => { if (reference) window.location.href = toAppUrl(`giving?reference=${encodeURIComponent(reference)}`) }

  const handleSubmit = async (e) => {
    e.preventDefault(); setSubmitting(true); setError('')
    let pendingRef = ''
    try {
      if (paymentMethod === 'crypto' && cryptoStep === 'form') {
        const p = await initializeGiving({ fund, donorName, donorEmail, donorPhone, amount: selectedAmount, message, source, ctaRef, paymentMethod: 'crypto', provider: 'crypto' })
        setReference(p.reference); setEthAddress(p.ethereumAddress || p.walletAddress); setBtcAddress(p.bitcoinAddress); setCryptoStep('verification'); setSubmitting(false); return
      }
      if (paymentMethod === 'bank-transfer' && bankTransferStep === 'form') {
        const p = await initializeGiving({ fund, donorName, donorEmail, donorPhone, amount: selectedAmount, message, source, ctaRef, paymentMethod: 'bank-transfer', provider: 'bank_transfer', bankAccountId: selectedBankAccount?.id || '' })
        setReference(p.reference || ''); const next = normalizeBankAccounts(p); if (next.length) setBankAccounts(next)
        if (p.bankAccountId) setSelectedBankId(String(p.bankAccountId)); setBankTransferStep('details')
        if (fund === 'sunday-offering') trackRumEvent({ metric: 'SUNDAY_OFFERING_INITIALIZED', value: 1, source: 'hero-giving-modal' })
        setSubmitting(false); return
      }
      if (paymentMethod === 'crypto' && cryptoStep === 'verification') {
        if (!txHash) { setError('Please provide your transaction hash.'); setSubmitting(false); return }
        setVerifying(true)
        const res = await fetch(toApiUrl('/api/giving/verify-crypto'), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ reference, txHash }) })
        const result = await res.json()
        if (result.ok) { window.location.href = toAppUrl(`giving?reference=${reference}`); return }
        throw new Error(result.error || 'Verification failed.')
      }
      const p = await initializeGiving({ fund, donorName, donorEmail, donorPhone, amount: selectedAmount, message, source, ctaRef, provider: 'paystack' })
      pendingRef = String(p?.reference || '').trim()
      if (fund === 'sunday-offering') trackRumEvent({ metric: 'SUNDAY_OFFERING_INITIALIZED', value: 1, source: 'hero-giving-modal' })
      if (!p?.reference) throw new Error('Payment reference is missing.')
      const publicKey = p?.publicKey || PAYSTACK_PUBLIC_KEY
      const PaystackPop = window.PaystackPop
      if (PaystackPop && publicKey && p.reference) {
        setSubmitting(false); let settled = false
        const finalize = async (ref) => { const r = String(ref || p.reference || '').trim(); if (!r) throw new Error('Payment reference is missing.'); try { await confirmGiving({ reference: r }) } catch { /* best-effort */ } onClose(); window.location.href = toAppUrl(`giving?reference=${encodeURIComponent(r)}`) }
        const abandon = async (msg) => { const r = String(p.reference || '').trim(); if (!r) return; try { await abandonGiving({ reference: r, providerMessage: msg }) } catch { /* best-effort */ } }
        function onSuccess(tx) { settled = true; void finalize(tx?.reference || p.reference) }
        function onCancel() {
          if (settled) return
          void (async () => { try { const r = await confirmGiving({ reference: p.reference }); if (r?.data?.status === 'success') { settled = true; await finalize(p.reference); return } } catch { /* ignore */ } await abandon('Payment was cancelled before completion.'); setError('Payment was cancelled. You can try again.') })()
        }
        function onError(err) {
          if (settled) return
          void (async () => { await abandon(String(err?.message || err?.msg || 'Payment popup failed before checkout could continue.').trim()); setError(String(err?.message || err?.msg || 'Could not open Paystack right now. Please try again.').trim()) })()
        }
        const popup = new PaystackPop()
        popup.newTransaction({ key: publicKey, email: donorEmail, amount: Math.round(selectedAmount * 100), currency: 'NGN', reference: p.reference, metadata: { donorName, donorPhone, fund, ctaRef, callbackUrl: p.callbackUrl || '', custom_fields: [{ display_name: 'Fund', variable_name: 'fund', value: fund }, { display_name: 'Name', variable_name: 'donor_name', value: donorName }] }, onSuccess, onCancel, onError })
        return
      }
      throw new Error('Paystack checkout failed to load. Please refresh and try again.')
    } catch (err) {
      if (paymentMethod === 'paystack' && pendingRef) { try { await abandonGiving({ reference: pendingRef, providerMessage: 'Payment popup failed before checkout could continue.' }) } catch { /* best-effort */ } }
      setError(err?.message || 'Unable to initialize payment right now.')
    } finally { setSubmitting(false) }
  }

  return {
    panelRef, closeRef, fund, setFund, amount, setAmount, customAmount, setCustomAmount,
    donorName, setDonorName, donorEmail, setDonorEmail, donorPhone, setDonorPhone,
    message, setMessage, submitting, paymentMethod, setPaymentMethod, reference,
    ethAddress, btcAddress, bankConfigLoading, bankConfigError, bankAccounts,
    selectedBankId, setSelectedBankId, bankTransferStep, txHash, setTxHash,
    cryptoStep, setCryptoStep, verifying, error, selectedAmount, selectedBankAccount,
    handleCopy, handlePresetClick, handleSubmit, goToReferencePage
  }
}
