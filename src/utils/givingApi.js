import { toApiUrl } from './appPaths'

const parseJson = async (response) => {
  const data = await response.json().catch(() => ({}))
  return { ok: response.ok, status: response.status, data }
}

export const initializeGiving = async (payload = {}) => {
  const response = await fetch(toApiUrl('/api/giving/initialize'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const parsed = await parseJson(response)
  if (!parsed.ok) {
    const error = new Error(parsed.data?.error || 'Unable to initialize giving payment.')
    error.status = parsed.status
    throw error
  }
  return parsed.data
}

export const confirmGiving = async ({ reference }) => {
  const safeReference = encodeURIComponent(String(reference || '').trim())
  const response = await fetch(toApiUrl(`/api/giving/confirm?reference=${safeReference}`))
  const parsed = await parseJson(response)
  if (!parsed.ok) {
    const error = new Error(parsed.data?.error || 'Unable to confirm giving payment.')
    error.status = parsed.status
    throw error
  }
  return parsed.data
}

export const abandonGiving = async ({ reference, providerMessage } = {}) => {
  const response = await fetch(toApiUrl('/api/giving/abandon'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      reference: String(reference || '').trim(),
      providerMessage: String(providerMessage || '').trim()
    })
  })

  const parsed = await parseJson(response)
  if (!parsed.ok) {
    const error = new Error(parsed.data?.error || 'Unable to update giving payment status.')
    error.status = parsed.status
    throw error
  }

  return parsed.data
}
