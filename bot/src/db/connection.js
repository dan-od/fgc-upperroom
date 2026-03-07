import pg from 'pg'

import { env } from '../config/env.js'
import { logger } from '../lib/logger.js'

const { Pool } = pg

let pool

export const initDatabase = () => {
  pool = new Pool({
    connectionString: env.DATABASE_URL
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
  try {
    return await client.query(sql, values)
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
