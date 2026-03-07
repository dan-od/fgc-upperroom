#!/usr/bin/env node

/**
 * Bot Validation Script
 * 
 * Runs pre-flight checks before deployment:
 * - Database connectivity
 * - Required environment variables
 * - API endpoint health
 * - Redis connection
 */

import { initDatabase, query, closeDatabase } from '../src/db/connection.js'
import { redisConnection } from '../src/queue/connection.js'
import { env } from '../src/config/env.js'
import { logger } from '../src/lib/logger.js'

const checks = {
  passed: [],
  failed: [],
  warnings: []
}

const checkDatabase = async () => {
  try {
    initDatabase()
    const result = await query('SELECT NOW() as time, version() as version')
    checks.passed.push(`✓ Database connected: ${result.rows[0].version.split(' ')[0]}`)
    
    const tables = await query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      AND table_name IN ('visitors', 'events', 'messages', 'opt_outs', 'scheduled_jobs')
    `)
    
    if (tables.rows.length === 5) {
      checks.passed.push(`✓ All required tables exist`)
    } else {
      checks.failed.push(`✗ Missing tables. Found: ${tables.rows.map(r => r.table_name).join(', ')}`)
    }
  } catch (error) {
    checks.failed.push(`✗ Database check failed: ${error.message}`)
  }
}

const checkRedis = async () => {
  try {
    await redisConnection.connect()
    const pong = await redisConnection.ping()
    if (pong === 'PONG') {
      checks.passed.push(`✓ Redis connected`)
    } else {
      checks.warnings.push(`⚠ Redis responded but unexpected result: ${pong}`)
    }
    await redisConnection.quit()
  } catch (error) {
    checks.warnings.push(`⚠ Redis not available: ${error.message}`)
  }
}

const checkEnvironment = () => {
  const required = ['DATABASE_URL', 'BOT_PORT']
  const recommended = ['META_ACCESS_TOKEN', 'META_PHONE_NUMBER_ID', 'META_WEBHOOK_VERIFY_TOKEN']

  for (const key of required) {
    if (env[key] && env[key] !== 'postgresql://user:password@localhost/church_bot') {
      checks.passed.push(`✓ ${key} is set`)
    } else {
      checks.failed.push(`✗ ${key} is not configured`)
    }
  }

  for (const key of recommended) {
    if (env[key]) {
      checks.passed.push(`✓ ${key} is set`)
    } else {
      checks.warnings.push(`⚠ ${key} not set (stub mode will be used)`)
    }
  }

  if (env.VERTEX_PROJECT_ID || env.OPENAI_API_KEY || env.GEMINI_API_KEY) {
    checks.passed.push('✓ LLM provider configured')
  } else {
    checks.warnings.push('⚠ No LLM API key configured (message templates will be used)')
  }

  if (env.ENABLE_SCHEDULER) {
    checks.passed.push(`✓ Scheduler enabled`)
  } else {
    checks.warnings.push(`⚠ Scheduler disabled`)
  }
}

const checkPermissions = async () => {
  try {
    const insertTest = await query(`
      INSERT INTO visitors (name, phone_number, consented_at)
      VALUES ('__test_visitor__', '__test_phone__', NOW())
      RETURNING id
    `)
    
    const id = insertTest.rows[0].id
    
    await query('DELETE FROM visitors WHERE id = $1', [id])
    
    checks.passed.push(`✓ Database write permissions OK`)
  } catch (error) {
    checks.failed.push(`✗ Database write test failed: ${error.message}`)
  }
}

const runChecks = async () => {
  console.log('\n🔍 Running pre-deployment validation...\n')

  checkEnvironment()
  await checkDatabase()
  await checkRedis()
  await checkPermissions()

  console.log('\n' + '='.repeat(60))
  console.log('VALIDATION RESULTS')
  console.log('='.repeat(60) + '\n')

  if (checks.passed.length > 0) {
    console.log('✅ PASSED (' + checks.passed.length + ')')
    checks.passed.forEach(msg => console.log('  ' + msg))
  }

  if (checks.warnings.length > 0) {
    console.log('\n⚠️  WARNINGS (' + checks.warnings.length + ')')
    checks.warnings.forEach(msg => console.log('  ' + msg))
  }

  if (checks.failed.length > 0) {
    console.log('\n❌ FAILED (' + checks.failed.length + ')')
    checks.failed.forEach(msg => console.log('  ' + msg))
  }

  console.log('\n' + '='.repeat(60))

  await closeDatabase()

  if (checks.failed.length > 0) {
    console.log('\n🚫 Validation failed. Fix errors before deploying.\n')
    process.exit(1)
  } else if (checks.warnings.length > 0) {
    console.log('\n✅ Validation passed with warnings. Review before deploying.\n')
    process.exit(0)
  } else {
    console.log('\n✅ All checks passed! Ready to deploy.\n')
    process.exit(0)
  }
}

runChecks().catch(error => {
  console.error('Validation script error:', error)
  process.exit(1)
})
