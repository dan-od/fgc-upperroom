import test from 'node:test'
import assert from 'node:assert/strict'

import { query } from '../../src/db/connection.js'
import { recordAttendanceCheckin } from '../../src/services/attendance-history.repository.js'
import { closeTestDb, ensureTestSchema, resetTestData } from '../helpers/db-test-utils.mjs'

let canRunDbTests = true

const isInfraBlocked = (error) => {
  const code = error?.code || error?.errors?.[0]?.code
  return ['EPERM', 'EACCES', 'ECONNREFUSED', 'ENOTFOUND'].includes(code)
}

test.before(async () => {
  try {
    await ensureTestSchema()
  } catch (error) {
    if (process.env.CI !== 'true' && isInfraBlocked(error)) {
      canRunDbTests = false
      return
    }
    throw error
  }
})

test.after(async () => {
  if (canRunDbTests) {
    await closeTestDb()
  }
})

test.beforeEach(async () => {
  if (!canRunDbTests) return
  await resetTestData()
})

test('recordAttendanceCheckin backfills a missing session before insert', async () => {
  if (!canRunDbTests) return

  const checkin = await recordAttendanceCheckin({
    checkinId: 'self-1',
    sessionId: 'session-2026-03-28',
    checkinType: 'self',
    attendeeName: 'Ada Obi',
    tokenHash: 'token-hash',
    ipHash: 'ip-hash',
    sourceService: 'attendance-service',
    occurredAt: '2026-03-28T09:19:35.978Z'
  })

  assert.equal(checkin.checkin_id, 'self-1')
  assert.equal(checkin.session_id, 'session-2026-03-28')

  const sessions = await query(
    'SELECT session_id, service_date::text AS service_date, source_service FROM attendance_sessions WHERE session_id = $1',
    ['session-2026-03-28']
  )

  assert.equal(sessions.rowCount, 1)
  assert.equal(sessions.rows[0].service_date, '2026-03-28')
  assert.equal(sessions.rows[0].source_service, 'attendance-service')
})
