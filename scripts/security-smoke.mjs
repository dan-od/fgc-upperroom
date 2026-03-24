import { createBotApp } from '../bot/src/app.js'

const assert = (condition, message) => {
  if (!condition) {
    throw new Error(message)
  }
}

const run = async () => {
  const app = createBotApp()
  const server = app.listen(0, '127.0.0.1')

  try {
    await new Promise((resolve, reject) => {
      server.once('listening', resolve)
      server.once('error', reject)
    })
  } catch (error) {
    const isLocalSkip = process.env.CI !== 'true' && (error?.code === 'EPERM' || error?.code === 'EACCES')
    if (isLocalSkip) {
      console.log(`[security] SKIP: socket bind blocked (${error.code})`)
      return
    }
    throw error
  }

  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Server address unavailable')
  }
  const { port } = address
  const base = `http://127.0.0.1:${port}`

  try {
    const health = await fetch(`${base}/bot/health`)
    assert(health.status === 200, `Expected 200 from /bot/health, got ${health.status}`)
    assert(health.headers.get('x-content-type-options') === 'nosniff', 'Missing x-content-type-options header')
    assert(health.headers.get('x-frame-options') === 'DENY', 'Missing x-frame-options header')
    assert(health.headers.get('referrer-policy') === 'no-referrer', 'Missing referrer-policy header')
    assert(Boolean(health.headers.get('content-security-policy')), 'Missing content-security-policy header')

    const unauthorized = await fetch(`${base}/bot/api/privacy/duplicates`)
    assert(unauthorized.status === 401 || unauthorized.status === 503, `Expected 401 or 503, got ${unauthorized.status}`)

    const wrongKey = await fetch(`${base}/bot/api/privacy/duplicates`, {
      headers: { 'x-bot-admin-key': 'wrong-key' }
    })
    assert(wrongKey.status === 401, `Expected 401 with wrong admin key, got ${wrongKey.status}`)

    console.log('[security] PASS')
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
}

run().catch((error) => {
  console.error('[security] FAIL:', error?.message || error)
  process.exit(1)
})
