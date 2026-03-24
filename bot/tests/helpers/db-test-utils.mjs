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

export const ensureTestSchema = async () => {
  const schema = await fs.readFile(schemaPath, 'utf8')
  initDatabase()
  await query(schema)
}

export const resetTestData = async () => {
  await query(clearSql)
}

export const closeTestDb = async () => {
  await closeDatabase()
}
