import dotenv from 'dotenv'
import path from 'node:path'

// Always load from root .env file
const rootEnvPath = path.resolve(process.cwd(), '.env')
dotenv.config({ path: rootEnvPath })

const toBool = (value, defaultValue = false) => {
  if (value === undefined) return defaultValue
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase())
}

export const env = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  BOT_PORT: Number(process.env.BOT_PORT || 4100),
  BOT_HOST: process.env.BOT_HOST || '0.0.0.0',
  TIMEZONE: process.env.BOT_TIMEZONE || 'Africa/Lagos',
  DATABASE_URL: process.env.DATABASE_URL || 'postgresql://user:password@localhost/church_bot',
  REDIS_URL: process.env.REDIS_URL || 'redis://127.0.0.1:6379',
  ENABLE_SCHEDULER: toBool(process.env.ENABLE_SCHEDULER, false),
  YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY || '',
  YOUTUBE_CHANNEL_ID: process.env.YOUTUBE_CHANNEL_ID || '',
  OPENAI_API_KEY: process.env.OPENAI_API_KEY || '',
  OPENAI_MODEL: process.env.OPENAI_MODEL || 'gpt-4o-mini',
  LLM_PROVIDER: process.env.LLM_PROVIDER || 'auto',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  GEMINI_MODEL: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
  VERTEX_PROJECT_ID: process.env.VERTEX_PROJECT_ID || '',
  VERTEX_LOCATION: process.env.VERTEX_LOCATION || 'us-central1',
  VERTEX_MODEL: process.env.VERTEX_MODEL || 'gemini-2.5-flash',
  VERTEX_SERVICE_ACCOUNT_JSON: process.env.VERTEX_SERVICE_ACCOUNT_JSON || '',
  WHATSAPP_PROVIDER: process.env.WHATSAPP_PROVIDER || 'meta',
  META_ACCESS_TOKEN: process.env.META_ACCESS_TOKEN || '',
  META_PHONE_NUMBER_ID: process.env.META_PHONE_NUMBER_ID || '',
  META_WABA_ID: process.env.META_WABA_ID || '',
  META_WEBHOOK_VERIFY_TOKEN: process.env.META_WEBHOOK_VERIFY_TOKEN || '',
  META_APP_SECRET: process.env.META_APP_SECRET || '',
  META_API_VERSION: process.env.META_API_VERSION || 'v21.0',
  ALERT_WEBHOOK_URL: process.env.ALERT_WEBHOOK_URL || ''
}
