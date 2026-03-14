import net from 'node:net'
import path from 'node:path'
import fs from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { spawnSync } from 'node:child_process'
import dotenv from 'dotenv'
import pg from 'pg'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const rootDir = path.resolve(__dirname, '..')

dotenv.config({ path: path.join(rootDir, '.env') })

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))
const { Client } = pg

const parseUrl = (raw, fallback) => {
  try {
    return new URL(raw || fallback)
  } catch {
    return new URL(fallback)
  }
}

const canConnect = (host, port, timeoutMs = 1500) => {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    let settled = false

    const done = (ok) => {
      if (settled) return
      settled = true
      socket.destroy()
      resolve(ok)
    }

    socket.setTimeout(timeoutMs)
    socket.once('connect', () => done(true))
    socket.once('timeout', () => done(false))
    socket.once('error', () => done(false))
    socket.connect(port, host)
  })
}

const canQueryPostgres = async (connectionString) => {
  const client = new Client({ connectionString })
  try {
    await client.connect()
    await client.query('SELECT 1')
    return true
  } catch {
    return false
  } finally {
    await client.end().catch(() => {})
  }
}

const waitUntilPostgresReady = async ({ connectionString, host, port, attempts = 40, delayMs = 1000 }) => {
  for (let i = 0; i < attempts; i += 1) {
    const ok = await canQueryPostgres(connectionString)
    if (ok) {
      console.log(`[preflight] Postgres query-ready at ${host}:${port}`)
      return true
    }
    await sleep(delayMs)
  }
  return false
}

const ensureBotSchema = async (connectionString, schemaPath) => {
  const schemaSql = await fs.readFile(schemaPath, 'utf8')
  const client = new Client({ connectionString })
  try {
    await client.connect()
    await client.query(schemaSql)
    console.log('[preflight] Bot database schema ensured.')
    return true
  } catch (error) {
    console.error('[preflight] Failed to apply bot schema:', error?.message || error)
    return false
  } finally {
    await client.end().catch(() => {})
  }
}

const waitUntilReachable = async ({ name, host, port, attempts = 30, delayMs = 1000 }) => {
  for (let i = 0; i < attempts; i += 1) {
    const ok = await canConnect(host, port)
    if (ok) {
      console.log(`[preflight] ${name} reachable at ${host}:${port}`)
      return true
    }
    await sleep(delayMs)
  }
  return false
}

const run = async () => {
  const dbUrl = parseUrl(process.env.DATABASE_URL, 'postgresql://botuser:strongpass@localhost:5433/church_bot')
  const redisUrl = parseUrl(process.env.REDIS_URL, 'redis://127.0.0.1:6379')

  const dbHost = dbUrl.hostname || 'localhost'
  const dbPort = Number(dbUrl.port || 5432)
  const dbPassword = decodeURIComponent(dbUrl.password || process.env.DB_PASSWORD || 'strongpass')
  const dbConnectionString = dbUrl.toString()

  const redisHost = redisUrl.hostname || '127.0.0.1'
  const redisPort = Number(redisUrl.port || 6379)

  const dbUp = await canQueryPostgres(dbConnectionString)
  const redisUp = await canConnect(redisHost, redisPort)
  const schemaPath = path.join(rootDir, 'bot', 'db', 'schema.sql')

  if (dbUp && redisUp) {
    console.log('[preflight] Postgres and Redis are reachable.')
    const schemaOk = await ensureBotSchema(dbConnectionString, schemaPath)
    if (!schemaOk) {
      process.exit(1)
    }
    process.exit(0)
  }

  console.log('[preflight] Starting missing infrastructure with Docker Compose (postgres, redis)...')

  const composeFile = path.join(rootDir, 'bot', 'docker-compose.yml')
  const compose = spawnSync(
    'docker',
    ['compose', '-f', composeFile, 'up', '-d', 'postgres', 'redis'],
    {
      stdio: 'inherit',
      cwd: rootDir,
      env: {
        ...process.env,
        DB_PASSWORD: dbPassword,
        DB_PORT: String(dbPort)
      }
    }
  )

  if (compose.status !== 0) {
    console.error('[preflight] Failed to start postgres/redis containers.')
    console.error('[preflight] Ensure Docker daemon is running and try again.')
    process.exit(1)
  }

  const dbReady = await waitUntilPostgresReady({ connectionString: dbConnectionString, host: dbHost, port: dbPort })
  const redisReady = await waitUntilReachable({ name: 'Redis', host: redisHost, port: redisPort })

  if (!dbReady || !redisReady) {
    console.error('[preflight] Infrastructure did not become reachable in time.')
    if (!dbReady) {
      console.error(`[preflight] Postgres still unreachable at ${dbHost}:${dbPort}.`)
    }
    if (!redisReady) {
      console.error(`[preflight] Redis still unreachable at ${redisHost}:${redisPort}.`)
    }
    process.exit(1)
  }

  const schemaOk = await ensureBotSchema(dbConnectionString, schemaPath)
  if (!schemaOk) {
    process.exit(1)
  }

  console.log('[preflight] Infrastructure is ready.')
  process.exit(0)
}

run().catch((error) => {
  console.error('[preflight] Unexpected error:', error?.message || error)
  process.exit(1)
})
