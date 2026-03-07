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

/**
 * POST subscriber data to the bot API and record the result in localStorage.
 *
 * @param {{ name: string, phone: string, email: string }} data
 * @returns {Promise<{ ok: boolean, message: string, visitor?: object }>}
 */
export const subscribeVisitor = async ({ name, phone, email }) => {
  // Normalise phone: strip spaces so DB stores cleanly
  const phoneNumber = phone.replace(/\s+/g, '')

  try {
    const res = await fetch(`${BOT_API_BASE}/bot/api/visitors`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phoneNumber, email })
    })

    if (res.ok) {
      const visitor = await res.json()
      // Permanently mark this browser as subscribed so the popup never shows again
      localStorage.setItem(SUBSCRIBED_KEY, 'true')
      return { ok: true, message: `Thank you ${name}! You'll receive WhatsApp reminders on ${phoneNumber}.`, visitor }
    }

    const err = await res.json().catch(() => ({}))
    return { ok: false, message: err.error || 'Something went wrong. Please try again.' }
  } catch {
    return { ok: false, message: 'Could not connect. Please check your connection and try again.' }
  }
}
