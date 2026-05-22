import { useRef, useState } from 'react'
import { FileUp, Upload } from 'lucide-react'
import { importBotVisitorsCsv } from '../../../utils/botApi'

export default function BotCsvImport({ darkMode, ui }) {
  const { surface, panel, border, text, subtext } = ui
  const fileInputRef = useRef(null)

  const [importFile, setImportFile] = useState(null)
  const [importResult, setImportResult] = useState(null)
  const [importLoading, setImportLoading] = useState(false)
  const [importError, setImportError] = useState('')

  const handleImport = async () => {
    if (!importFile) {
      setImportError('Choose a CSV file before importing.')
      return
    }

    setImportLoading(true)
    setImportError('')
    setImportResult(null)

    try {
      const result = await importBotVisitorsCsv(importFile)
      setImportResult(result)
      setImportFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      setImportError(error?.message || 'Unable to import the CSV file.')
    } finally {
      setImportLoading(false)
    }
  }

  return (
    <section style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'minmax(0, 1.1fr) minmax(320px, 0.9fr)' }}>
      <article style={{ border: `1px solid ${border}`, borderRadius: '0.85rem', background: surface, padding: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.85rem', color: text }}>
          <FileUp size={16} />
          <h2 style={{ margin: 0, fontSize: '1.1rem' }}>Visitor CSV Import</h2>
        </div>

        <p style={{ margin: '0 0 0.9rem', color: subtext, lineHeight: 1.6 }}>
          Upload a CSV with at least `phone_number`. Optional fields like `name`, `email`, `first_visit_date`, `tags`, and `timezone` are picked up when present.
        </p>

        <div style={{ display: 'grid', gap: '0.85rem' }}>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(event) => {
              setImportFile(event.target.files?.[0] || null)
              setImportError('')
              setImportResult(null)
            }}
            style={{ color: text }}
          />

          <button
            type="button"
            onClick={() => void handleImport()}
            disabled={importLoading}
            style={{
              border: '0',
              borderRadius: '0.65rem',
              background: '#0f172a',
              color: '#f8fafc',
              padding: '0.8rem 1rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              fontWeight: 700,
              cursor: 'pointer',
              opacity: importLoading ? 0.75 : 1,
              width: 'fit-content'
            }}
          >
            <Upload size={15} />
            {importLoading ? 'Importing...' : 'Import CSV'}
          </button>

          {importError ? (
            <div style={{ border: '1px solid #fca5a5', borderRadius: '0.65rem', background: '#fef2f2', color: '#991b1b', padding: '0.8rem' }}>
              {importError}
            </div>
          ) : null}

          {importResult ? (
            <div style={{ border: `1px solid ${border}`, borderRadius: '0.75rem', background: panel, padding: '0.9rem' }}>
              <strong style={{ color: text }}>Import summary</strong>
              <div style={{ display: 'grid', gap: '0.3rem', marginTop: '0.65rem', color: subtext, fontSize: '0.9rem' }}>
                <span>Total rows: {importResult.total ?? 0}</span>
                <span>Imported: {importResult.imported ?? 0}</span>
                <span>Failed: {importResult.failed ?? 0}</span>
              </div>
              {Array.isArray(importResult.errors) && importResult.errors.length > 0 ? (
                <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.35rem' }}>
                  <strong style={{ color: text }}>Validation notes</strong>
                  <ul style={{ margin: 0, paddingLeft: '1.1rem', color: subtext, lineHeight: 1.5 }}>
                    {importResult.errors.slice(0, 6).map((error) => (
                      <li key={error}>{error}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </article>

      <aside style={{ border: `1px solid ${border}`, borderRadius: '0.85rem', background: surface, padding: '1rem' }}>
        <h2 style={{ margin: '0 0 0.75rem', fontSize: '1.1rem', color: text }}>Quick Notes</h2>
        <ul style={{ margin: 0, paddingLeft: '1.15rem', color: subtext, lineHeight: 1.7 }}>
          <li>Service reminders use the Saturday dispatch window already wired into the bot scheduler.</li>
          <li>Preview messages fall back to templates if the configured LLM provider is unavailable.</li>
          <li>Message logs include joined visitor and event metadata for faster triage.</li>
          <li>CSV imports rehydrate visitors and re-enable subscriptions when a phone number already exists.</li>
        </ul>
      </aside>
    </section>
  )
}
