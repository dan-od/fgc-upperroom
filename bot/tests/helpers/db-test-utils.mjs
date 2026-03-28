import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { closeDatabase, initDatabase, query } from '../../src/db/connection.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const schemaPath = path.resolve(__dirname, '../../db/schema.sql')

const clearSql = `
TRUNCATE TABLE
  messages,
  event_rsvps,
  conversation_feedback,
  prayer_requests,
  member_profiles,
  visitor_duplicates,
  opt_outs,
  scheduled_jobs,
  attendance_checkins,
  attendance_sessions,
  events,
  visitors
RESTART IDENTITY CASCADE
`

const seedMessageTemplatesSql = `
INSERT INTO message_templates (template_key, channel, content, is_active, metadata)
VALUES
  ('service_reminder', 'whatsapp', 'Hi {{name}}, this is a reminder that our Sunday service starts at {{serviceTime}}. {{specialLine}} We would love to see you. God bless you! Reply STOP to opt out.', TRUE, '{"category":"reminder"}'::jsonb),
  ('event_reminder', 'whatsapp', 'Hi {{name}}, {{eventTitle}} is coming up on {{eventDate}}. {{eventTimeLine}} {{registrationLine}} We look forward to seeing you. Reply STOP to opt out.', TRUE, '{"category":"reminder"}'::jsonb),
  ('welcome_message', 'whatsapp', 'Welcome to FGC Upper Room{{nameSuffix}}! You are now subscribed to service and event reminders. Reply STOP at any time to unsubscribe.', TRUE, '{"category":"system"}'::jsonb),
  ('faq_service_time', 'whatsapp', 'Our regular Sunday youth service starts at 8:00 AM, and first Sundays start at 7:30 AM.', TRUE, '{"category":"faq"}'::jsonb),
  ('faq_location', 'whatsapp', 'We are at 36 Shell Location Road, Mgbuoba, Port Harcourt.', TRUE, '{"category":"faq"}'::jsonb),
  ('faq_contact', 'whatsapp', 'You can reach us on WhatsApp at +2347031526399 or email upperroom@fgcmgbuoba.org.', TRUE, '{"category":"faq"}'::jsonb),
  ('prayer_ack', 'whatsapp', 'Thank you {{name}}. Your prayer request has been received. Our prayer team will stand with you in faith.', TRUE, '{"category":"inbound"}'::jsonb),
  ('feedback_ack', 'whatsapp', 'Thank you {{name}}. We appreciate your feedback and will review it carefully.', TRUE, '{"category":"inbound"}'::jsonb),
  ('default_auto_reply', 'whatsapp', 'Thank you for reaching out to FGC Upper Room. Reply with PRAYER to submit a prayer request, FEEDBACK: your message to share feedback, or ask about service time/location/contact.', TRUE, '{"category":"inbound"}'::jsonb)
ON CONFLICT (template_key) DO UPDATE
SET channel = EXCLUDED.channel,
    content = EXCLUDED.content,
    is_active = EXCLUDED.is_active,
    metadata = EXCLUDED.metadata,
    updated_at = now()
`

export const ensureTestSchema = async () => {
  const schema = await fs.readFile(schemaPath, 'utf8')
  initDatabase()
  await query(schema)
}

export const resetTestData = async () => {
  await query(clearSql)
  await query(seedMessageTemplatesSql)
}

export const closeTestDb = async () => {
  await closeDatabase()
}
