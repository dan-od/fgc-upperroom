import { performance } from 'node:perf_hooks'

import { createBotApp } from '../bot/src/app.js'
import { closeDatabase, initDatabase } from '../bot/src/db/connection.js'

const REQUESTS = Number(process.env.PERF_REQUESTS || 60)
const P95_BUDGET_MS = Number(process.env.PERF_P95_MS || 450)

const percentile = (values, p) => {
  if (!values.length) return 0
  const sorted = [...values].sort((a, b) => a - b)
  const idx = Math.max(0, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[Math.min(idx, sorted.length - 1)]
}

const run = async () => {
  initDatabase()
  const app = createBotApp()
  const server = app.listen(0, '127.0.0.1')

  try {
    await new Promise((resolve, reject) => {
      server.once('listening', resolve)
      server.once('error', reject)
    })
  } catch (error) {
    const isLocalSkip = process.env.CI !== 'true' && (error?.code === 'EPERM' || error?.code === 'EACCES')
    if (isLocalSkip) {
      console.log(`[perf] SKIP: socket bind blocked (${error.code})`)
      await closeDatabase()
      return
    }
    throw error
  }

  const address = server.address()
  if (!address || typeof address === 'string') {
    throw new Error('Server address unavailable')
  }
  const { port } = address
  const url = `http://127.0.0.1:${port}/bot/health`
  const times = []

  try {
    for (let i = 0; i < REQUESTS; i += 1) {
      const started = performance.now()
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Unexpected status ${response.status}`)
      }
      await response.text()
      times.push(performance.now() - started)
    }

    const p95 = percentile(times, 95)
    const avg = times.reduce((a, b) => a + b, 0) / times.length
    console.log(`[perf] requests=${REQUESTS} avgMs=${avg.toFixed(2)} p95Ms=${p95.toFixed(2)} budgetMs=${P95_BUDGET_MS}`)

    if (p95 > P95_BUDGET_MS) {
      throw new Error(`Performance budget exceeded: p95 ${p95.toFixed(2)}ms > ${P95_BUDGET_MS}ms`)
    }

    console.log('[perf] PASS')
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()))
    })
    await closeDatabase()
  }
}

run().catch((error) => {
  console.error('[perf] FAIL:', error?.message || error)
  process.exit(1)
})
