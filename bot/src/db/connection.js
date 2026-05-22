import pg from 'pg'

import { env } from '../config/env.js'
import { logger } from '../lib/logger.js'
import { recordDbMetric } from '../services/telemetry.service.js'

const { Pool } = pg

let pool

export const initDatabase = () => {
  pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 20,
    min: 2,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
    ssl: env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  })

  pool.on('error', (err) => {
    logger.error('Unexpected error on idle client', { error: err.message })
  })

  logger.info('Database pool initialized', { env: env.NODE_ENV })
}

export const getPool = () => {
  if (!pool) {
    initDatabase()
  }
  return pool
}

export const query = async (sql, values = []) => {
  const client = await getPool().connect()
  const startedAt = process.hrtime.bigint()
  try {
    const result = await client.query(sql, values)
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
    recordDbMetric({ durationMs, isError: false, slowThresholdMs: env.MONITORING_SLOW_QUERY_MS })

    if (durationMs >= env.MONITORING_SLOW_QUERY_MS) {
      const statement = String(sql || '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 180)
      logger.warn('Slow DB query', { durationMs: Number(durationMs.toFixed(2)), rows: result.rowCount, sql: statement })
    }

    return result
  } catch (error) {
    const durationMs = Number(process.hrtime.bigint() - startedAt) / 1_000_000
    recordDbMetric({ durationMs, isError: true, slowThresholdMs: env.MONITORING_SLOW_QUERY_MS })
    logger.error('DB query failed', { durationMs: Number(durationMs.toFixed(2)), error: error.message })
    throw error
  } finally {
    client.release()
  }
}

export const closeDatabase = async () => {
  if (pool) {
    await pool.end()
    logger.info('Database pool closed')
  }
}
