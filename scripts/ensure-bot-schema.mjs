import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import pg from 'pg'
import { loadProjectEnvFile } from '../lib/load-project-env.js'

const { Client } = pg
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')
const schemaPath = path.join(rootDir, 'bot', 'db', 'schema.sql')

loadProjectEnvFile({ envPath: path.join(rootDir, '.env') })

const connectionString = process.env.DATABASE_URL || 'postgresql://user:password@localhost/church_bot'

const run = async () => {
  const schema = await fs.readFile(schemaPath, 'utf8')
  const client = new Client({ connectionString })
  await client.connect()
  try {
    await client.query(schema)
    console.log('[schema] ensured')
  } finally {
    await client.end()
  }
}

run().catch((error) => {
  const code = error?.code || error?.errors?.[0]?.code
  const isLocalSkip = process.env.CI !== 'true' && ['EPERM', 'EACCES', 'ECONNREFUSED', 'ENOTFOUND'].includes(code)
  if (isLocalSkip) {
    console.log(`[schema] SKIP: infrastructure unavailable (${code})`)
    process.exit(0)
  }
  console.error('[schema] failed:', error?.message || error)
  process.exit(1)
})
