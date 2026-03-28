import test from 'node:test'
import assert from 'node:assert/strict'

import {
  SATURDAY_SERVICE_DISPATCH_END_HOUR_UTC,
  SATURDAY_SERVICE_DISPATCH_START_HOUR_UTC,
  isSaturdayServiceDispatchWindow
} from '../../src/services/reminder.service.js'

test('Saturday service dispatch window is open from 11:00 UTC through 17:59 UTC on Saturdays', () => {
  const openingTime = new Date('2026-03-28T11:00:00.000Z')
  const lateWindow = new Date('2026-03-28T17:59:59.000Z')

  assert.equal(SATURDAY_SERVICE_DISPATCH_START_HOUR_UTC, 11)
  assert.equal(SATURDAY_SERVICE_DISPATCH_END_HOUR_UTC, 18)
  assert.equal(isSaturdayServiceDispatchWindow(openingTime), true)
  assert.equal(isSaturdayServiceDispatchWindow(lateWindow), true)
})

test('Saturday service dispatch window stays closed before 11:00 UTC and at 18:00 UTC or later', () => {
  assert.equal(isSaturdayServiceDispatchWindow(new Date('2026-03-28T10:59:59.000Z')), false)
  assert.equal(isSaturdayServiceDispatchWindow(new Date('2026-03-28T18:00:00.000Z')), false)
})

test('Saturday service dispatch window is closed on non-Saturdays', () => {
  assert.equal(isSaturdayServiceDispatchWindow(new Date('2026-03-27T12:00:00.000Z')), false)
  assert.equal(isSaturdayServiceDispatchWindow(new Date('2026-03-29T12:00:00.000Z')), false)
})
