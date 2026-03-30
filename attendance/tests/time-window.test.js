import test from 'node:test'
import assert from 'node:assert/strict'
import { getWindowStatus, isAttendanceWindowOpen } from '../utils/time.js'

const withTestFlag = (value, fn) => {
  const previous = process.env.ATTENDANCE_TEST_OPEN
  if (value === undefined) {
    delete process.env.ATTENDANCE_TEST_OPEN
  } else {
    process.env.ATTENDANCE_TEST_OPEN = value
  }

  try {
    fn()
  } finally {
    if (previous === undefined) {
      delete process.env.ATTENDANCE_TEST_OPEN
    } else {
      process.env.ATTENDANCE_TEST_OPEN = previous
    }
  }
}

test('attendance window boundaries in Lagos time (Sunday 00:00 to 18:00)', () => {
  withTestFlag('false', () => {
    const saturday2359 = new Date('2026-03-28T22:59:00.000Z')
    const sunday0000 = new Date('2026-03-28T23:00:00.000Z')
    const sunday1759 = new Date('2026-03-29T16:59:00.000Z')
    const sunday1800 = new Date('2026-03-29T17:00:00.000Z')

    assert.equal(isAttendanceWindowOpen(saturday2359), false)
    assert.equal(isAttendanceWindowOpen(sunday0000), true)
    assert.equal(isAttendanceWindowOpen(sunday1759), true)
    assert.equal(isAttendanceWindowOpen(sunday1800), false)

    const status = getWindowStatus(sunday1759)
    assert.deepEqual(
      {
        isOpen: status.isOpen,
        isSunday: status.isSunday,
        testMode: status.testMode
      },
      {
        isOpen: true,
        isSunday: true,
        testMode: false
      }
    )
    assert.ok(String(status.closesAt || '').includes('T18:00:00+01:00'))
  })
})

test('ATTENDANCE_TEST_OPEN=true forces live Sunday mode', () => {
  withTestFlag('true', () => {
    const randomWeekday = new Date('2026-03-25T08:30:00.000Z')

    assert.equal(isAttendanceWindowOpen(randomWeekday), true)

    const status = getWindowStatus(randomWeekday)
    assert.equal(status.isOpen, true)
    assert.equal(status.isSunday, true)
    assert.equal(status.testMode, true)
    assert.ok(status.closesAt)
  })
})
