import pg from 'pg'

const { Pool } = pg

let pool = null

export const getAttendancePool = () => {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL must be set for attendance DB write-through')
    }
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 5,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    })
    pool.on('error', (err) => console.error('[attendance-db] Pool error:', err.message))
  }
  return pool
}

export const closeAttendancePool = async () => {
  if (pool) {
    await pool.end()
    pool = null
  }
}
