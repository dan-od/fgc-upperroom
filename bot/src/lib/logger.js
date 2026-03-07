export const logger = {
  debug: (message, context = {}) => console.debug(JSON.stringify({ level: 'debug', message, ...context })),
  info: (message, context = {}) => console.log(JSON.stringify({ level: 'info', message, ...context })),
  warn: (message, context = {}) => console.warn(JSON.stringify({ level: 'warn', message, ...context })),
  error: (message, context = {}) => console.error(JSON.stringify({ level: 'error', message, ...context }))
}
