import express from 'express'
import multer from 'multer'

import { importVisitorsCsv } from '../services/csv-import.service.js'
import { logger } from '../lib/logger.js'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 5 * 1024 * 1024 } })

router.post('/import-csv', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'CSV file is required' })
    }

    if (!req.file.originalname.endsWith('.csv')) {
      return res.status(400).json({ error: 'File must be CSV format' })
    }

    const result = await importVisitorsCsv(req.file.buffer)

    if (result.errors.length > 0) {
      logger.warn('CSV import had validation errors', { errors: result.errors })
    }

    res.json({
      status: 'completed',
      imported: result.imported,
      failed: result.failed,
      total: result.total,
      errors: result.errors
    })
  } catch (error) {
    logger.error('Failed to import CSV', { error: error.message })
    res.status(500).json({ error: 'Failed to import CSV file' })
  }
})

export default router
