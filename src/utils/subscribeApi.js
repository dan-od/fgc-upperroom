import { subscribeEmail } from './newsletterApi'

/**
 * Subscribe a visitor to WhatsApp reminders via the church bot API.
 *
 * In development, the Vite dev server proxies `/bot` → http://localhost:4100,
 * so relative URLs work out of the box.
 * In production, set VITE_BOT_API_URL to the bot's base URL
 * (e.g. https://bot.yourchurch.org) — leave it empty when the bot and
 * frontend are served from the same origin.
 */

const BOT_API_BASE = import.meta.env.VITE_BOT_API_URL || ''

/** localStorage key used to suppress the popup after a successful sign-up */
export const SUBSCRIBED_KEY = 'upperroom_subscribed'

/**
 * Returns true if this browser has previously completed a subscription.
 */
export const hasSubscribed = () => Boolean(localStorage.getItem(SUBSCRIBED_KEY))

const markSubscribed = () => {
  localStorage.setItem(SUBSCRIBED_KEY, 'true')
}

/**
 * POST subscriber data to the bot API and record the result in localStorage.
 *
 * @param {{ name: string, phone: string, email: string, reminderPreferences?: object }} data
 * @returns {Promise<{ ok: boolean, message: string, visitor?: object }>}
 */
export const subscribeVisitor = async ({ name, phone, email, reminderPreferences }) => {
  // Normalise phone: strip spaces so DB stores cleanly
  const phoneNumber = String(phone || '').replace(/\s+/g, '')
  const emailAddress = String(email || '').trim()
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Africa/Lagos'

  try {
    const res = await fetch(`${BOT_API_BASE}/bot/api/visitors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phoneNumber, email: emailAddress, timezone, reminderPreferences })
    })

    if (res.ok) {
      const visitor = await res.json()
      if (emailAddress) {
        subscribeEmail({
          name,
          email: emailAddress,
          phoneNumber,
          source: 'whatsapp-signup'
        }).catch(() => {})
      }

      // Permanently mark this browser as subscribed so the popup never shows again
      markSubscribed()
      const channelMessage = emailAddress
        ? `WhatsApp reminders on ${phoneNumber} and email event updates`
        : `WhatsApp reminders on ${phoneNumber}`
      return { ok: true, message: `Thank you ${name}! You'll receive ${channelMessage}.`, visitor }
    }

    const err = await res.json().catch(() => ({}))
    return { ok: false, message: err.error || 'Something went wrong. Please try again.' }
  } catch {
    return { ok: false, message: 'Could not connect. Please check your connection and try again.' }
  }
}

export const subscribeToUpdates = async ({ name, phone = '', email = '', reminderPreferences, source = 'website' }) => {
  const cleanName = String(name || '').trim()
  const cleanPhone = String(phone || '').trim()
  const cleanEmail = String(email || '').trim()
  const hasPhone = Boolean(cleanPhone)
  const hasEmail = Boolean(cleanEmail)

  if (!cleanName || (!hasPhone && !hasEmail)) {
    return { ok: false, message: 'Please enter your name and at least one contact method.' }
  }

  const failures = []
  let visitor

  if (hasPhone) {
    const result = await subscribeVisitor({
      name: cleanName,
      phone: cleanPhone,
      email: cleanEmail,
      reminderPreferences
    })

    if (!result.ok) {
      failures.push(result.message || 'WhatsApp subscription failed.')
    } else {
      visitor = result.visitor
    }
  }

  if (hasEmail) {
    try {
      await subscribeEmail({
        name: cleanName,
        email: cleanEmail,
        phoneNumber: cleanPhone.replace(/\s+/g, ''),
        source
      })
    } catch (error) {
      failures.push(error?.message || 'Email subscription failed.')
    }
  }

  if (failures.length > 0) {
    return { ok: false, message: failures.join(' ') }
  }

  markSubscribed()

  if (hasPhone && hasEmail) {
    return { ok: true, message: `Thank you ${cleanName}! You'll receive WhatsApp reminders and email updates.`, visitor }
  }

  if (hasPhone) {
    return { ok: true, message: `Thank you ${cleanName}! You'll receive WhatsApp reminders.`, visitor }
  }

  return { ok: true, message: `Thank you ${cleanName}! You'll receive email updates.` }
}
