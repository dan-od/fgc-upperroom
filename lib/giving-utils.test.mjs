import test from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import {
  mapPaystackEventToStatus,
  resolveGivingStatus,
  toKobo,
  verifyPaystackSignature
} from './giving-utils.js'

test('toKobo converts naira to kobo with rounding', () => {
  assert.equal(toKobo(100), 10000)
  assert.equal(toKobo(100.5), 10050)
  assert.ok(Number.isNaN(toKobo('oops')))
})

test('resolveGivingStatus preserves strongest lifecycle status', () => {
  assert.equal(resolveGivingStatus('pending', 'abandoned'), 'abandoned')
  assert.equal(resolveGivingStatus('failed', 'pending'), 'failed')
  assert.equal(resolveGivingStatus('success', 'failed'), 'success')
})

test('mapPaystackEventToStatus maps known webhook events', () => {
  assert.equal(mapPaystackEventToStatus('charge.success'), 'success')
  assert.equal(mapPaystackEventToStatus('charge.failed'), 'failed')
  assert.equal(mapPaystackEventToStatus('charge.abandoned'), 'abandoned')
  assert.equal(mapPaystackEventToStatus('unknown.event'), 'pending')
})

test('verifyPaystackSignature validates HMAC sha512 signature', () => {
  const secret = 'test-secret'
  const rawBody = JSON.stringify({ event: 'charge.success', data: { reference: 'URG-1' } })
  const signature = crypto.createHmac('sha512', secret).update(rawBody).digest('hex')

  assert.equal(
    verifyPaystackSignature({ rawBody, signature, secretKey: secret }),
    true
  )

  assert.equal(
    verifyPaystackSignature({ rawBody, signature: 'bad-signature', secretKey: secret }),
    false
  )
})
