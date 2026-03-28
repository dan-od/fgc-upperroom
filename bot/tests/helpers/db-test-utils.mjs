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
  ('service_reminder', 'whatsapp', 'Hi {{name}}, just a quick reminder from FGC Upper Room. Sunday service starts at {{serviceTime}} tomorrow. {{specialLine}} See you if you can make it. God bless you. Reply STOP to opt out.', TRUE, '{"category":"reminder"}'::jsonb),
  ('event_reminder', 'whatsapp', 'Hi {{name}}, {{eventTitle}} is coming up on {{eventDate}}. {{eventTimeLine}} {{registrationLine}} Hope you can make it. God bless you. Reply STOP to opt out.', TRUE, '{"category":"reminder"}'::jsonb),
  ('welcome_message', 'whatsapp', 'Welcome to FGC Upper Room{{nameSuffix}}. You are now on our WhatsApp list for Sunday reminders and event updates. Reply STOP any time to unsubscribe.', TRUE, '{"category":"system"}'::jsonb),
  ('faq_service_time', 'whatsapp', 'Sunday youth service starts at 8:00 AM. First Sundays start at 7:30 AM.', TRUE, '{"category":"faq"}'::jsonb),
  ('faq_location', 'whatsapp', 'We meet at 36 Shell Location Road, Mgbuoba, Port Harcourt.', TRUE, '{"category":"faq"}'::jsonb),
  ('faq_contact', 'whatsapp', 'You can reach us on WhatsApp at +2347031526399 or email upperroom@fgcmgbuoba.org.', TRUE, '{"category":"faq"}'::jsonb),
  ('prayer_ack', 'whatsapp', 'Thanks {{name}}. We have your prayer request, and the prayer team will keep it in prayer.', TRUE, '{"category":"inbound"}'::jsonb),
  ('feedback_ack', 'whatsapp', 'Thanks {{name}}. We have your feedback and will read it carefully.', TRUE, '{"category":"inbound"}'::jsonb),
  ('default_auto_reply', 'whatsapp', 'Thanks for reaching out to FGC Upper Room. Send PRAYER for prayer requests, FEEDBACK for feedback, or ask about service time, location, or contact details.', TRUE, '{"category":"inbound"}'::jsonb)
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
