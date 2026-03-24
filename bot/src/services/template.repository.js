import { query } from '../db/connection.js'

const TEMPLATE_TOKEN_REGEX = /\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}/g

export const listMessageTemplates = async ({ channel = 'whatsapp', includeInactive = false } = {}) => {
  const result = await query(
    `
    SELECT *
    FROM message_templates
    WHERE channel = $1
      AND ($2::boolean = true OR is_active = true)
    ORDER BY template_key ASC
    `,
    [String(channel || 'whatsapp'), Boolean(includeInactive)]
  )

  return result.rows
}

export const getMessageTemplateByKey = async (templateKey, { channel = 'whatsapp' } = {}) => {
  const result = await query(
    `
    SELECT *
    FROM message_templates
    WHERE template_key = $1
      AND channel = $2
      AND is_active = true
    LIMIT 1
    `,
    [String(templateKey || '').trim(), String(channel || 'whatsapp')]
  )

  return result.rows[0] || null
}

export const upsertMessageTemplate = async ({
  templateKey,
  content,
  channel = 'whatsapp',
  isActive = true,
  metadata = {}
} = {}) => {
  const key = String(templateKey || '').trim()
  const text = String(content || '').trim()
  if (!key || !text) {
    throw new Error('templateKey and content are required')
  }

  const result = await query(
    `
    INSERT INTO message_templates (template_key, channel, content, is_active, metadata)
    VALUES ($1, $2, $3, $4, $5::jsonb)
    ON CONFLICT (template_key) DO UPDATE
    SET channel = EXCLUDED.channel,
        content = EXCLUDED.content,
        is_active = EXCLUDED.is_active,
        metadata = EXCLUDED.metadata,
        updated_at = now()
    RETURNING *
    `,
    [key, String(channel || 'whatsapp'), text, Boolean(isActive), metadata || {}]
  )

  return result.rows[0] || null
}

export const renderTemplateContent = (templateContent, variables = {}) => {
  const source = String(templateContent || '')
  if (!source) return ''

  return source.replace(TEMPLATE_TOKEN_REGEX, (_match, token) => {
    const value = variables[token]
    return value === undefined || value === null ? '' : String(value)
  }).replace(/\s{2,}/g, ' ').trim()
}

export const renderTemplateByKey = async (templateKey, variables = {}, options = {}) => {
  const template = await getMessageTemplateByKey(templateKey, options)
  if (!template) {
    return null
  }

  return renderTemplateContent(template.content, variables)
}
