import { toApiUrl } from './appPaths'

const request = async (url, options = {}) => {
  const response = await fetch(url, options)
  const payload = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new Error(payload?.error || `Request failed (${response.status})`)
  }

  return payload
}

export const submitContactForm = async ({
  name,
  email,
  subject,
  message,
  phoneNumber = '',
  source = 'website'
}) => {
  return request(toApiUrl('/api/contact/submit'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      email,
      subject,
      message,
      phoneNumber,
      source
    })
  })
}
