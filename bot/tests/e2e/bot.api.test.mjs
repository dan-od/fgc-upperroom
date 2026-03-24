import test from 'node:test'
import assert from 'node:assert/strict'

import { createBotApp } from '../../src/app.js'
import { closeTestDb, ensureTestSchema, resetTestData } from '../helpers/db-test-utils.mjs'

let server
let baseUrl
let canRunHttpTests = true
let canRunDbTests = true

const adminHeaders = () => ({
  'x-bot-admin-key': process.env.BOT_ADMIN_API_KEY || 'test-admin'
})

const adminJsonHeaders = () => ({
  ...adminHeaders(),
  'content-type': 'application/json'
})

const isInfraBlocked = (error) => {
  const code = error?.code || error?.errors?.[0]?.code
  return ['EPERM', 'EACCES', 'ECONNREFUSED', 'ENOTFOUND'].includes(code)
}

test.before(async () => {
  try {
    await ensureTestSchema()
    await resetTestData()
  } catch (error) {
    if (process.env.CI !== 'true' && isInfraBlocked(error)) {
      canRunDbTests = false
      canRunHttpTests = false
      return
    }
    throw error
  }

  const app = createBotApp()
  server = app.listen(0, '127.0.0.1')

  try {
    await new Promise((resolve, reject) => {
      server.once('listening', resolve)
      server.once('error', reject)
    })
    const address = server.address()
    if (!address || typeof address === 'string') {
      throw new Error('Server address unavailable')
    }
    baseUrl = `http://127.0.0.1:${address.port}`
  } catch (error) {
    const isLocalSkip = process.env.CI !== 'true' && (error?.code === 'EPERM' || error?.code === 'EACCES')
    if (isLocalSkip) {
      canRunHttpTests = false
      return
    }
    throw error
  }
})

test.after(async () => {
  if (server) {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
  }
  if (canRunDbTests) {
    await closeTestDb()
  }
})

test.beforeEach(async () => {
  if (!canRunDbTests) return
  await resetTestData()
})

test('GET /bot/health returns core service status', async () => {
  if (!canRunHttpTests) return
  const response = await fetch(`${baseUrl}/bot/health`)
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(body.status, 'ok')
  assert.equal(body.service, 'church-whatsapp-bot')
})

test('GET /bot/monitoring/metrics returns APM snapshot', async () => {
  if (!canRunHttpTests) return
  const response = await fetch(`${baseUrl}/bot/monitoring/metrics`)
  assert.equal(response.status, 200)
  const body = await response.json()
  assert.equal(typeof body?.telemetry?.http?.total, 'number')
  assert.equal(typeof body?.telemetry?.db?.total, 'number')
})

test('POST /bot/api/visitors validates and creates visitors', async () => {
  if (!canRunHttpTests) return
  const bad = await fetch(`${baseUrl}/bot/api/visitors`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'No Phone' })
  })
  assert.equal(bad.status, 400)

  const created = await fetch(`${baseUrl}/bot/api/visitors`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'E2E User',
      phoneNumber: '08077778888',
      email: 'e2e@example.com'
    })
  })

  assert.equal(created.status, 201)
  const visitor = await created.json()
  assert.equal(visitor.phone_number, '+2348077778888')
  assert.equal(Array.isArray(visitor.duplicateRulesApplied), true)
})

test('visitor reminder preference endpoints persist and return selected options', async () => {
  if (!canRunHttpTests) return

  const created = await fetch(`${baseUrl}/bot/api/visitors`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Reminder Preference User',
      phoneNumber: '08070707070',
      email: 'reminder.pref@example.com',
      reminderPreferences: {
        eventReminderFrequency: 'key-dates',
        eventIds: ['event-a'],
        serviceReminders: true
      }
    })
  })
  assert.equal(created.status, 201)

  const getResponse = await fetch(`${baseUrl}/bot/api/visitors/08070707070/reminder-preferences`)
  assert.equal(getResponse.status, 200)
  const getBody = await getResponse.json()
  assert.equal(getBody.reminderPreferences.eventReminderFrequency, 'key-dates')
  assert.deepEqual(getBody.reminderPreferences.eventIds, ['event-a'])

  const patchResponse = await fetch(`${baseUrl}/bot/api/visitors/08070707070/reminder-preferences`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      reminderPreferences: {
        eventReminderFrequency: 'daily',
        eventIds: ['event-b', 'event-c']
      }
    })
  })
  assert.equal(patchResponse.status, 200)
  const patchBody = await patchResponse.json()
  assert.equal(patchBody.reminderPreferences.eventReminderFrequency, 'daily')
  assert.deepEqual(patchBody.reminderPreferences.eventIds, ['event-b', 'event-c'])
})

test('event RSVP endpoint places additional attendees on waitlist when full', async () => {
  if (!canRunHttpTests) return

  const eventResponse = await fetch(`${baseUrl}/bot/api/events`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      title: 'E2E RSVP Event',
      eventDate: '2099-10-01',
      capacityLimit: 1,
      rsvpEnabled: true
    })
  })
  assert.equal(eventResponse.status, 201)
  const event = await eventResponse.json()

  const firstRsvpResponse = await fetch(`${baseUrl}/bot/api/events/${event.id}/rsvp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      fullName: 'First RSVP',
      phoneNumber: '08010101010'
    })
  })
  assert.equal(firstRsvpResponse.status, 201)
  const firstRsvp = await firstRsvpResponse.json()
  assert.equal(firstRsvp.rsvp.status, 'going')

  const secondRsvpResponse = await fetch(`${baseUrl}/bot/api/events/${event.id}/rsvp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      fullName: 'Second RSVP',
      phoneNumber: '08020202020'
    })
  })
  assert.equal(secondRsvpResponse.status, 201)
  const secondRsvp = await secondRsvpResponse.json()
  assert.equal(secondRsvp.rsvp.status, 'waitlist')

  const summaryResponse = await fetch(`${baseUrl}/bot/api/events/${event.id}/rsvp-summary`)
  assert.equal(summaryResponse.status, 200)
  const summary = await summaryResponse.json()
  const counts = Object.fromEntries((summary.counts || []).map((item) => [item.status, Number(item.count)]))
  assert.equal(counts.going, 1)
  assert.equal(counts.waitlist, 1)
})

test('prayer requests support admin-protected management endpoints', async () => {
  if (!canRunHttpTests) return

  const createResponse = await fetch(`${baseUrl}/bot/api/prayer-requests`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      requesterName: 'E2E Prayer User',
      requestText: 'Please pray for our family',
      phoneNumber: '08030303030',
      priority: 'urgent'
    })
  })
  assert.equal(createResponse.status, 201)
  const created = await createResponse.json()
  assert.equal(created.request.status, 'new')
  assert.equal(created.request.priority, 'urgent')

  const noAuthList = await fetch(`${baseUrl}/bot/api/prayer-requests`)
  assert.equal(noAuthList.status, 401)

  const authList = await fetch(`${baseUrl}/bot/api/prayer-requests`, {
    headers: adminHeaders()
  })
  assert.equal(authList.status, 200)
  const listed = await authList.json()
  assert.equal(listed.requests.some((request) => request.id === created.request.id), true)

  const updateResponse = await fetch(`${baseUrl}/bot/api/prayer-requests/${created.request.id}/status`, {
    method: 'PATCH',
    headers: adminJsonHeaders(),
    body: JSON.stringify({
      status: 'in_progress',
      assignedTo: 'Pastor E2E'
    })
  })
  assert.equal(updateResponse.status, 200)
  const updated = await updateResponse.json()
  assert.equal(updated.request.status, 'in_progress')
})

test('members sync and lifecycle endpoints are admin-protected and functional', async () => {
  if (!canRunHttpTests) return

  const createdVisitorResponse = await fetch(`${baseUrl}/bot/api/visitors`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'E2E Member',
      phoneNumber: '08040404040',
      email: 'e2e.member@example.com'
    })
  })
  assert.equal(createdVisitorResponse.status, 201)
  const createdVisitor = await createdVisitorResponse.json()

  const syncNoAuth = await fetch(`${baseUrl}/bot/api/members/sync-from-visitors`, { method: 'POST' })
  assert.equal(syncNoAuth.status, 401)

  const syncResponse = await fetch(`${baseUrl}/bot/api/members/sync-from-visitors`, {
    method: 'POST',
    headers: adminHeaders()
  })
  assert.equal(syncResponse.status, 200)
  const syncBody = await syncResponse.json()
  assert.equal(syncBody.synced >= 1, true)

  const listMembersResponse = await fetch(`${baseUrl}/bot/api/members`, {
    headers: adminHeaders()
  })
  assert.equal(listMembersResponse.status, 200)
  const membersBody = await listMembersResponse.json()
  const member = membersBody.members.find((item) => item.visitor_id === createdVisitor.id)
  assert.equal(Boolean(member), true)

  const lifecycleResponse = await fetch(`${baseUrl}/bot/api/members/${member.id}/lifecycle`, {
    method: 'PATCH',
    headers: adminJsonHeaders(),
    body: JSON.stringify({
      lifecycleState: 'moved',
      lifecycleReason: 'E2E migration',
      movedTo: 'Abuja'
    })
  })
  assert.equal(lifecycleResponse.status, 200)
  const lifecycleBody = await lifecycleResponse.json()
  assert.equal(lifecycleBody.member.lifecycle_state, 'moved')
  assert.equal(lifecycleBody.member.moved_to, 'Abuja')
})

test('privacy endpoints enforce admin auth and can soft-delete visitors', async () => {
  if (!canRunHttpTests) return

  const firstVisitorResponse = await fetch(`${baseUrl}/bot/api/visitors`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Dup One',
      phoneNumber: '08050505050',
      email: 'dup@example.com'
    })
  })
  assert.equal(firstVisitorResponse.status, 201)
  const firstVisitor = await firstVisitorResponse.json()

  const secondVisitorResponse = await fetch(`${baseUrl}/bot/api/visitors`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Dup Two',
      phoneNumber: '08060606060',
      email: 'dup@example.com'
    })
  })
  assert.equal(secondVisitorResponse.status, 201)

  const duplicatesNoAuth = await fetch(`${baseUrl}/bot/api/privacy/duplicates`)
  assert.equal(duplicatesNoAuth.status, 401)

  const duplicatesAuth = await fetch(`${baseUrl}/bot/api/privacy/duplicates`, {
    headers: adminHeaders()
  })
  assert.equal(duplicatesAuth.status, 200)
  const duplicatesBody = await duplicatesAuth.json()
  assert.equal(Array.isArray(duplicatesBody.duplicates), true)
  assert.equal(duplicatesBody.duplicates.length >= 1, true)

  const softDeleteResponse = await fetch(`${baseUrl}/bot/api/privacy/visitors/${firstVisitor.id}/soft-delete`, {
    method: 'POST',
    headers: adminJsonHeaders(),
    body: JSON.stringify({ reason: 'e2e_soft_delete', purgeAfterDays: 7 })
  })
  assert.equal(softDeleteResponse.status, 200)
  const softDeleteBody = await softDeleteResponse.json()
  assert.equal(softDeleteBody.visitor.deleted_reason, 'e2e_soft_delete')
  assert.equal(softDeleteBody.visitor.is_subscribed, false)
})

test('admin template and holiday endpoints are secured and writable', async () => {
  if (!canRunHttpTests) return

  const noAuthTemplates = await fetch(`${baseUrl}/bot/api/admin/templates`)
  assert.equal(noAuthTemplates.status, 401)

  const authTemplates = await fetch(`${baseUrl}/bot/api/admin/templates`, {
    headers: adminHeaders()
  })
  assert.equal(authTemplates.status, 200)
  const templatesBody = await authTemplates.json()
  assert.equal(templatesBody.templates.some((item) => item.template_key === 'service_reminder'), true)

  const upsertTemplateResponse = await fetch(`${baseUrl}/bot/api/admin/templates/event_reminder`, {
    method: 'PUT',
    headers: adminJsonHeaders(),
    body: JSON.stringify({
      content: 'Hi {{name}}, {{eventTitle}} is on {{eventDate}}. {{registrationLine}}',
      channel: 'whatsapp',
      isActive: true
    })
  })
  assert.equal(upsertTemplateResponse.status, 200)

  const upsertHolidayResponse = await fetch(`${baseUrl}/bot/api/admin/holidays`, {
    method: 'PUT',
    headers: adminJsonHeaders(),
    body: JSON.stringify({
      holidayDate: '2026-12-25',
      holidayName: 'Christmas Day',
      timezone: '*',
      skipReminders: true
    })
  })
  assert.equal(upsertHolidayResponse.status, 200)

  const listHolidaysResponse = await fetch(`${baseUrl}/bot/api/admin/holidays`, {
    headers: adminHeaders()
  })
  assert.equal(listHolidaysResponse.status, 200)
  const holidaysBody = await listHolidaysResponse.json()
  assert.equal(holidaysBody.holidays.some((item) => String(item.holiday_date).startsWith('2026-12-25')), true)
})

test('inbound conversational feedback is captured and exposed via admin feedback endpoint', async () => {
  if (!canRunHttpTests) return

  const webhookResponse = await fetch(`${baseUrl}/bot/webhooks/whatsapp`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      entry: [
        {
          changes: [
            {
              value: {
                messages: [
                  {
                    id: 'wamid.e2e.feedback',
                    from: '2348070707070',
                    text: { body: 'feedback: The reminder was very clear and helpful.' }
                  }
                ]
              }
            }
          ]
        }
      ]
    })
  })
  assert.equal(webhookResponse.status, 200)

  await new Promise((resolve) => setTimeout(resolve, 100))

  const feedbackResponse = await fetch(`${baseUrl}/bot/api/admin/feedback`, {
    headers: adminHeaders()
  })
  assert.equal(feedbackResponse.status, 200)
  const feedbackBody = await feedbackResponse.json()
  assert.equal(
    feedbackBody.feedback.some((item) => item.feedback_text.includes('reminder was very clear')),
    true
  )
})
