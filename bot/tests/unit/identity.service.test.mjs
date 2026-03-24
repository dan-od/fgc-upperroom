import test from 'node:test'
import assert from 'node:assert/strict'

import {
  hashPhoneNumber,
  isValidPhoneNumber,
  normalizeEmail,
  normalizePhoneNumber,
  scoreDuplicateCandidate
} from '../../src/services/identity.service.js'

test('normalizePhoneNumber converts local format to E.164', () => {
  assert.equal(normalizePhoneNumber('08012345678'), '+2348012345678')
  assert.equal(normalizePhoneNumber('+1 (415) 555-1212'), '+14155551212')
})

test('phone number validation allows only valid E.164', () => {
  assert.equal(isValidPhoneNumber('+2348012345678'), true)
  assert.equal(isValidPhoneNumber('08012345678'), false)
  assert.equal(isValidPhoneNumber('+001234'), false)
})

test('normalizeEmail lowercases and trims', () => {
  assert.equal(normalizeEmail('  TEST@Example.COM '), 'test@example.com')
})

test('hashPhoneNumber is deterministic for equivalent input', () => {
  const left = hashPhoneNumber('08012345678')
  const right = hashPhoneNumber('+2348012345678')
  assert.equal(left, right)
  assert.equal(left.length, 64)
})

test('scoreDuplicateCandidate marks exact email as high confidence', () => {
  const output = scoreDuplicateCandidate({
    existing: { email: 'a@b.com', phone_number: '+2348011111111', name: 'Ada Obi' },
    nameKey: 'ada obi',
    email: 'a@b.com',
    phone: '+2348099999999'
  })

  assert.equal(output.score, 95)
  assert.deepEqual(output.reasons, ['exact_email'])
})

