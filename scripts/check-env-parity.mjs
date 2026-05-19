import fs from 'node:fs/promises'
import path from 'node:path'

const projectRoot = process.cwd()

const ENV_FILES = [
  '.env.example',
  'env/.env.development.example',
  'env/.env.staging.example',
  'env/.env.production.example'
]

const REQUIRED_KEYS = [
  'BOT_PORT',
  'BOT_HOST',
  'BOT_TIMEZONE',
  'ENABLE_SCHEDULER',
  'BOT_ADMIN_API_KEY',
  'DATABASE_URL',
  'REDIS_URL',
  'MONITORING_SLOW_QUERY_MS',
  'MONITORING_SLOW_REQUEST_MS',
  'WHATSAPP_PROVIDER',
  'META_ACCESS_TOKEN',
  'META_PHONE_NUMBER_ID',
  'META_WABA_ID',
  'META_WEBHOOK_VERIFY_TOKEN',
  'META_APP_SECRET',
  'META_API_VERSION',
  'LLM_PROVIDER',
  'VERTEX_PROJECT_ID',
  'VERTEX_LOCATION',
  'VERTEX_MODEL',
  'OPENAI_API_KEY',
  'OPENAI_MODEL',
  'GEMINI_API_KEY',
  'GEMINI_MODEL',
  'YOUTUBE_API_KEY',
  'YOUTUBE_CHANNEL_ID',
  'ALERT_WEBHOOK_URL',
  'OPENCLAW_HOOK_URL',
  'OPENCLAW_HOOK_TOKEN',
  'OPENCLAW_HOOK_MODE',
  'OPENCLAW_HOOK_TIMEOUT_MS',
  'VITE_RUM_ENABLED',
  'VITE_RUM_ENDPOINT'
]

const parseKeys = (source) => {
  const keys = new Set()
  const lines = String(source || '').split('\n')

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      continue
    }

    const match = trimmed.match(/^([A-Z0-9_]+)\s*=/)
    if (match?.[1]) {
      keys.add(match[1])
    }
  }

  return keys
}

const setDiff = (left, right) => {
  return [...left].filter((item) => !right.has(item)).sort()
}

const run = async () => {
  const loaded = []

  for (const relativePath of ENV_FILES) {
    const absolutePath = path.join(projectRoot, relativePath)
    try {
      const raw = await fs.readFile(absolutePath, 'utf8')
      loaded.push({
        path: relativePath,
        keys: parseKeys(raw)
      })
    } catch {
      console.error(`[env-parity] Missing file: ${relativePath}`)
      process.exitCode = 1
      return
    }
  }

  const baseline = loaded[0]
  let hasFailure = false

  console.log(`[env-parity] Baseline: ${baseline.path} (${baseline.keys.size} keys)\n`)

  for (const file of loaded.slice(1)) {
    const missing = setDiff(baseline.keys, file.keys)
    const extra = setDiff(file.keys, baseline.keys)

    if (missing.length === 0 && extra.length === 0) {
      console.log(`[env-parity] OK: ${file.path}`)
      continue
    }

    hasFailure = true
    console.error(`[env-parity] Drift detected in ${file.path}`)
    if (missing.length > 0) {
      console.error(`  missing: ${missing.join(', ')}`)
    }
    if (extra.length > 0) {
      console.error(`  extra: ${extra.join(', ')}`)
    }
  }

  for (const file of loaded) {
    const missingRequired = REQUIRED_KEYS.filter((key) => !file.keys.has(key))
    if (missingRequired.length > 0) {
      hasFailure = true
      console.error(`[env-parity] Required keys missing in ${file.path}: ${missingRequired.join(', ')}`)
    }
  }

  if (hasFailure) {
    console.error('\n[env-parity] FAILED')
    process.exitCode = 1
    return
  }

  console.log('\n[env-parity] PASS')
}

run().catch((error) => {
  console.error(`[env-parity] Unexpected failure: ${error?.message || error}`)
  process.exitCode = 1
})
