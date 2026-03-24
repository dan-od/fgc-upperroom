import test from 'node:test'
import assert from 'node:assert/strict'

import { query } from '../../src/db/connection.js'
import { createOrUpdateEventRsvp, getEventRsvpSummary } from '../../src/services/event-rsvp.repository.js'
import { createEvent } from '../../src/services/event.repository.js'
import { syncMemberProfileFromVisitor, updateMemberLifecycle } from '../../src/services/member.repository.js'
import { eraseVisitorData } from '../../src/services/privacy.repository.js'
import { createPrayerRequest, listPrayerRequests, updatePrayerRequestStatus } from '../../src/services/prayer.repository.js'
import {
  createVisitor,
  findPotentialVisitorDuplicates,
  getVisitorReminderPreferences,
  getVisitorByPhone,
  markDoNotContact,
  updateVisitorReminderPreferences
} from '../../src/services/visitor.repository.js'
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

test('createVisitor normalizes core identity fields', async () => {
  if (!canRunDbTests) return
  const visitor = await createVisitor({
    name: '  John   Doe ',
    phoneNumber: '08012345678',
    email: ' JOHN@Example.COM '
  })

  assert.equal(visitor.phone_number, '+2348012345678')
  assert.equal(visitor.email, 'john@example.com')
  assert.equal(visitor.normalized_name, 'john doe')
})

test('visitor reminder preferences are normalized and persisted', async () => {
  if (!canRunDbTests) return

  const visitor = await createVisitor({
    name: 'Reminder User',
    phoneNumber: '08099990000',
    email: 'reminder@example.com',
    reminderPreferences: {
      frequency: 'key-dates',
      eventIds: ['evt-1', 'evt-1', 'evt-2'],
      serviceReminders: false
    }
  })

  assert.equal(visitor.reminder_preferences.eventReminderFrequency, 'key-dates')
  assert.equal(visitor.reminder_preferences.serviceReminders, false)
  assert.deepEqual(visitor.reminder_preferences.eventIds, ['evt-1', 'evt-2'])

  const updated = await updateVisitorReminderPreferences('08099990000', {
    eventReminderFrequency: 'daily',
    eventIds: ['evt-3']
  })

  assert.equal(updated.reminder_preferences.eventReminderFrequency, 'daily')
  assert.equal(updated.reminder_preferences.eventReminders, true)
  assert.deepEqual(updated.reminder_preferences.eventIds, ['evt-3'])

  const persisted = await getVisitorReminderPreferences('08099990000')
  assert.equal(persisted.eventReminderFrequency, 'daily')
  assert.deepEqual(persisted.eventIds, ['evt-3'])
})

test('findPotentialVisitorDuplicates returns high-confidence matches', async () => {
  if (!canRunDbTests) return
  await createVisitor({
    name: 'Ada Obi',
    phoneNumber: '08011112222',
    email: 'ada@example.com'
  })

  const second = await createVisitor({
    name: 'Ada Obi',
    phoneNumber: '08033334444',
    email: 'ada@example.com'
  })

  const duplicates = await findPotentialVisitorDuplicates({
    name: second.name,
    email: second.email,
    phoneNumber: second.phone_number,
    excludeVisitorId: second.id
  })

  assert.equal(duplicates.length > 0, true)
  assert.equal(duplicates[0].score >= 95, true)
  assert.equal(duplicates[0].reasons.includes('exact_email'), true)
})

test('markDoNotContact updates subscription flags and opt-out table', async () => {
  if (!canRunDbTests) return
  await createVisitor({
    name: 'Mina',
    phoneNumber: '08055556666',
    email: 'mina@example.com'
  })

  const updated = await markDoNotContact('08055556666', 'manual_test')
  assert.equal(updated.is_subscribed, false)
  assert.equal(updated.do_not_contact, true)

  const found = await getVisitorByPhone('+2348055556666')
  assert.equal(Boolean(found), true)

  const optOut = await query('SELECT phone_number, reason FROM opt_outs WHERE phone_number = $1', ['+2348055556666'])
  assert.equal(optOut.rowCount, 1)
  assert.equal(optOut.rows[0].reason, 'manual_test')
})

test('createOrUpdateEventRsvp enforces waitlist when event capacity is reached', async () => {
  if (!canRunDbTests) return

  const event = await createEvent({
    title: 'Capacity Test Event',
    eventDate: '2099-11-10',
    capacityLimit: 1,
    rsvpEnabled: true
  })

  const first = await createOrUpdateEventRsvp({
    eventId: event.id,
    fullName: 'First Person',
    phoneNumber: '08011110000'
  })
  assert.equal(first.rsvp.status, 'going')

  const second = await createOrUpdateEventRsvp({
    eventId: event.id,
    fullName: 'Second Person',
    phoneNumber: '08011110001'
  })
  assert.equal(second.rsvp.status, 'waitlist')

  const summary = await getEventRsvpSummary(event.id)
  const counts = Object.fromEntries((summary?.counts || []).map((item) => [item.status, Number(item.count)]))
  assert.equal(counts.going, 1)
  assert.equal(counts.waitlist, 1)
})

test('updateMemberLifecycle keeps visitor.member_state in sync', async () => {
  if (!canRunDbTests) return

  const visitor = await createVisitor({
    name: 'Member Sync',
    phoneNumber: '08022223333',
    email: 'member.sync@example.com'
  })
  const member = await syncMemberProfileFromVisitor(visitor)
  assert.equal(member.lifecycle_state, 'active')

  const updatedMember = await updateMemberLifecycle(member.id, {
    lifecycleState: 'moved',
    lifecycleReason: 'Relocated',
    movedTo: 'Abuja'
  })

  assert.equal(updatedMember.lifecycle_state, 'moved')
  assert.equal(updatedMember.moved_to, 'Abuja')

  const visitorState = await query('SELECT member_state, moved_to FROM visitors WHERE id = $1', [visitor.id])
  assert.equal(visitorState.rows[0].member_state, 'moved')
  assert.equal(visitorState.rows[0].moved_to, 'Abuja')
})

test('prayer requests can be closed and filtered from open lists', async () => {
  if (!canRunDbTests) return

  const request = await createPrayerRequest({
    requesterName: 'Prayer User',
    requestText: 'Please pray for my exams',
    phoneNumber: '08033334444',
    priority: 'urgent'
  })

  assert.equal(request.priority, 'urgent')
  assert.equal(request.phone_number, '+2348033334444')
  assert.equal(request.status, 'new')

  const closed = await updatePrayerRequestStatus(request.id, {
    status: 'closed',
    assignedTo: 'Pastor John',
    notes: 'Prayed and followed up'
  })

  assert.equal(closed.status, 'closed')
  assert.equal(closed.assigned_to, 'Pastor John')
  assert.equal(Boolean(closed.resolved_at), true)

  const activeOnly = await listPrayerRequests({ includeClosed: false })
  assert.equal(activeOnly.some((item) => item.id === request.id), false)
})

test('eraseVisitorData redacts visitor and soft-deletes linked records', async () => {
  if (!canRunDbTests) return

  const visitor = await createVisitor({
    name: 'Erase Me',
    phoneNumber: '08044445555',
    email: 'erase.me@example.com'
  })

  await syncMemberProfileFromVisitor(visitor)

  await createPrayerRequest({
    visitorId: visitor.id,
    requesterName: 'Erase Me',
    requestText: 'Private prayer request',
    phoneNumber: '08044445555'
  })

  const event = await createEvent({
    title: 'Privacy Event',
    eventDate: '2099-12-20',
    capacityLimit: 10,
    rsvpEnabled: true
  })

  await createOrUpdateEventRsvp({
    eventId: event.id,
    visitorId: visitor.id,
    fullName: 'Erase Me',
    phoneNumber: '08044445555'
  })

  const outcome = await eraseVisitorData({
    visitorId: visitor.id,
    reason: 'test_erasure'
  })

  assert.equal(outcome.affected.prayerRequests, 1)
  assert.equal(outcome.affected.eventRsvps, 1)
  assert.equal(outcome.affected.memberProfiles, 1)
  assert.equal(outcome.visitor.name, 'Erased Member')
  assert.equal(outcome.visitor.deleted_reason, 'test_erasure')
  assert.equal(outcome.visitor.phone_number.startsWith('erased-'), true)
})
