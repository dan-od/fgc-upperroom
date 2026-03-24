const SERVICE_NAME = 'fgc-upperroom-bot'

const emit = (method, level, message, context = {}) => {
  const payload = {
    ts: new Date().toISOString(),
    level,
    service: SERVICE_NAME,
    pid: process.pid,
    message,
    ...context
  }

  try {
    console[method](JSON.stringify(payload))
  } catch {
    console[method](JSON.stringify({ ts: payload.ts, level, service: SERVICE_NAME, message: String(message || '') }))
  }
}

export const logger = {
  debug: (message, context = {}) => emit('debug', 'debug', message, context),
  info: (message, context = {}) => emit('log', 'info', message, context),
  warn: (message, context = {}) => emit('warn', 'warn', message, context),
  error: (message, context = {}) => emit('error', 'error', message, context)
}
