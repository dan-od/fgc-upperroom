#!/usr/bin/env node

/**
 * Load Test Simulation
 * 
 * Simulates bulk message sending to test rate limiting and throttling
 */

import { query, initDatabase, closeDatabase } from '../src/db/connection.js'
import { logger } from '../src/lib/logger.js'

const createTestVisitors = async (count) => {
  console.log(`\n📊 Creating ${count} test visitors...`)

  const visitors = []
  for (let i = 1; i <= count; i++) {
    try {
      const result = await query(
        `INSERT INTO visitors (name, phone_number, is_subscribed, consented_at, tags)
         VALUES ($1, $2, true, NOW(), ARRAY['test'])
         ON CONFLICT (phone_number) DO UPDATE SET updated_at = NOW()
         RETURNING id, phone_number`,
        [`Test Visitor ${i}`, `+234800000${String(i).padStart(4, '0')}`]
      )
      visitors.push(result.rows[0])
    } catch (error) {
      console.error(`Failed to create visitor ${i}:`, error.message)
    }
  }

  console.log(`✓ Created ${visitors.length} test visitors`)
  return visitors
}

const simulateMessageBatch = async (visitors) => {
  console.log(`\n🚀 Simulating message batch (${visitors.length} recipients)...`)

  const RATE_LIMIT = 60
  const BATCH_DELAY = 1000

  let sent = 0
  let throttled = 0
  const startTime = Date.now()

  for (const visitor of visitors) {
    if (sent % RATE_LIMIT === 0 && sent > 0) {
      throttled++
      console.log(`  ⏸  Throttle (${throttled}) - waiting ${BATCH_DELAY}ms`)
      await new Promise(resolve => setTimeout(resolve, BATCH_DELAY))
    }

    await query(
      `INSERT INTO messages (visitor_id, message_text, status, sent_time)
       VALUES ($1, $2, 'sent', NOW())`,
      [visitor.id, `Test message for ${visitor.phone_number}`]
    )

    sent++
    if (sent % 10 === 0) {
      process.stdout.write(`  📨 Sent: ${sent}/${visitors.length}\r`)
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2)
  const rate = (sent / duration).toFixed(2)

  console.log(`\n\n✅ Batch complete:`)
  console.log(`   Total sent: ${sent}`)
  console.log(`   Duration: ${duration}s`)
  console.log(`   Rate: ${rate} msg/s`)
  console.log(`   Throttle events: ${throttled}`)
}

const cleanupTestData = async () => {
  console.log(`\n🧹 Cleaning up test data...`)

  await query(`DELETE FROM messages WHERE visitor_id IN (SELECT id FROM visitors WHERE tags @> ARRAY['test'])`)
  await query(`DELETE FROM visitors WHERE tags @> ARRAY['test']`)

  console.log(`✓ Cleanup complete`)
}

const runLoadTest = async () => {
  const visitorCount = parseInt(process.argv[2]) || 100

  console.log('\n⚡ Load Test Simulation')
  console.log('='.repeat(60))
  console.log(`Visitor count: ${visitorCount}`)
  console.log('='.repeat(60))

  initDatabase()

  try {
    const visitors = await createTestVisitors(visitorCount)
    await simulateMessageBatch(visitors)
    await cleanupTestData()

    console.log('\n✅ Load test complete\n')
  } catch (error) {
    console.error('\n❌ Load test failed:', error)
  } finally {
    await closeDatabase()
  }
}

runLoadTest().catch(error => {
  console.error('Load test error:', error)
  process.exit(1)
})
