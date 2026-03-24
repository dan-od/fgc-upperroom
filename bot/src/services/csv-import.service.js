import { parse } from 'csv-parse/sync'

import { createVisitor } from './visitor.repository.js'
import { isValidPhoneNumber, normalizePhoneNumber } from './identity.service.js'
import { syncMemberProfileFromVisitor } from './member.repository.js'
import { logger } from '../lib/logger.js'

export const parseVisitorsCsv = (fileBuffer) => {
  const content = fileBuffer.toString('utf-8')
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  })

  return records
}

export const validateVisitorRecord = (record, rowNumber) => {
  const errors = []
  const normalizedPhone = normalizePhoneNumber(record.phone_number || '')

  if (!record.phone_number || !record.phone_number.trim()) {
    errors.push(`Row ${rowNumber}: phone_number is required`)
  }

  if (record.phone_number && !isValidPhoneNumber(normalizedPhone)) {
    errors.push(`Row ${rowNumber}: phone_number must be valid E.164 format`)
  }

  if (record.first_visit_date && isNaN(Date.parse(record.first_visit_date))) {
    errors.push(`Row ${rowNumber}: first_visit_date must be valid ISO date`)
  }

  if (record.consented_at && record.consented_at.toLowerCase() !== 'true' && record.consented_at !== '1' && record.consented_at !== 'yes') {
    errors.push(`Row ${rowNumber}: consented_at must be true/yes/1 to import`)
  }

  return { valid: errors.length === 0, errors }
}

export const importVisitorsCsv = async (fileBuffer) => {
  const records = parseVisitorsCsv(fileBuffer)
  const results = {
    total: records.length,
    imported: 0,
    failed: 0,
    errors: []
  }

  for (let i = 0; i < records.length; i++) {
    const record = records[i]
    const rowNumber = i + 2

    const validation = validateVisitorRecord(record, rowNumber)
    if (!validation.valid) {
      results.failed++
      results.errors.push(...validation.errors)
      continue
    }

    try {
      const visitor = await createVisitor({
        name: record.name || '',
        phoneNumber: normalizePhoneNumber(record.phone_number),
        firstVisitDate: record.first_visit_date ? new Date(record.first_visit_date) : undefined,
        tags: record.tags ? record.tags.split(',').map((t) => t.trim()) : [],
        timezone: record.timezone || 'Africa/Lagos',
        consentedAt: new Date()
      })

      await syncMemberProfileFromVisitor(visitor).catch((error) => {
        logger.warn('Failed to sync member profile during CSV import', { visitorId: visitor.id, error: error.message })
      })

      results.imported++
      logger.info('Visitor imported', { phone: visitor.phone_number, name: visitor.name })
    } catch (error) {
      results.failed++
      results.errors.push(`Row ${rowNumber}: Failed to import - ${error.message}`)
      logger.error('Failed to import visitor record', { row: rowNumber, error: error.message })
    }
  }

  logger.info('CSV import completed', results)
  return results
}
