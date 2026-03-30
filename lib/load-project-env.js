import fs from 'node:fs'
import path from 'node:path'

import dotenv from 'dotenv'

const ASSIGNMENT_PATTERN = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/

const computeJsonBalance = (value = '') => {
  let depth = 0
  let inString = false
  let escapeNext = false

  for (const char of String(value)) {
    if (escapeNext) {
      escapeNext = false
      continue
    }

    if (char === '\\' && inString) {
      escapeNext = true
      continue
    }

    if (char === '"') {
      inString = !inString
      continue
    }

    if (inString) continue

    if (char === '{' || char === '[') depth += 1
    if (char === '}' || char === ']') depth -= 1
  }

  return depth
}

const extractMultilineJsonValues = (raw = '') => {
  const lines = String(raw).split(/\r?\n/)
  const collected = {}

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (!line || /^\s*#/.test(line)) continue

    const match = line.match(ASSIGNMENT_PATTERN)
    if (!match) continue

    const [, key, remainder] = match
    const trimmed = String(remainder || '').trim()
    if (!trimmed.startsWith('[') && !trimmed.startsWith('{')) {
      continue
    }

    let combined = trimmed
    let balance = computeJsonBalance(trimmed)
    if (balance <= 0) continue

    while (index + 1 < lines.length && balance > 0) {
      index += 1
      combined += `\n${lines[index]}`
      balance = computeJsonBalance(combined)
    }

    collected[key] = combined.trim()
  }

  return collected
}

const interpolateValue = (value, lookup, { jsonMode = false } = {}) => {
  let resolved = String(value || '')

  if (jsonMode) {
    resolved = resolved.replace(
      /([:\[,]\s*)(\{([A-Z0-9_]+)\}|\$\{([A-Z0-9_]+)\})(?=\s*[,}\]])/g,
      (_match, prefix, _token, braceName, dollarName) => {
        const key = braceName || dollarName
        return `${prefix}${JSON.stringify(String(lookup(key) || ''))}`
      }
    )
  }

  resolved = resolved.replace(/\$\{([A-Z0-9_]+)\}/g, (_match, key) => String(lookup(key) || ''))
  resolved = resolved.replace(/\{([A-Z0-9_]+)\}/g, (_match, key) => String(lookup(key) || ''))

  return resolved
}

export const loadProjectEnvFile = ({
  envPath = path.resolve(process.cwd(), '.env'),
  override = false
} = {}) => {
  if (!fs.existsSync(envPath)) {
    return {}
  }

  const raw = fs.readFileSync(envPath, 'utf8')
  const parsed = dotenv.parse(raw)
  const multilineJson = extractMultilineJsonValues(raw)
  const lookup = (key) => multilineJson[key] ?? parsed[key] ?? process.env[key] ?? ''

  const merged = {
    ...parsed
  }

  for (const [key, value] of Object.entries(multilineJson)) {
    merged[key] = interpolateValue(value, lookup, { jsonMode: true })
  }

  for (const [key, value] of Object.entries(merged)) {
    if (override || process.env[key] === undefined) {
      process.env[key] = String(value)
    }
  }

  return merged
}
