import { useEffect, useState } from 'react'
import { createVisitorRecord, fetchVisitors, updateVisitorSubscriptionStatus } from '../../../utils/visitorApi'

const escapeCsv = (value) => {
  const text = String(value ?? '')
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function useVisitorsCrud({
  filteredVisitors,
  visitors,
  setVisitors,
  openModal,
  setNotice,
  selectedVisitors,
  setSelectedVisitors,
  visitorForm,
  setVisitorForm,
  EMPTY_VISITOR_FORM
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const refreshVisitors = async ({ silent = false } = {}) => {
    if (!silent) setIsLoading(true)
    try {
      const nextVisitors = await fetchVisitors()
      setVisitors(nextVisitors)
      return nextVisitors
    } catch (error) {
      setNotice({ tone: 'error', text: error?.message || 'Unable to load visitors right now.' })
      return []
    } finally {
      if (!silent) setIsLoading(false)
    }
  }

  useEffect(() => {
    void refreshVisitors()
  }, [])

  useEffect(() => {
    const validIds = new Set(visitors.map((visitor) => String(visitor.id)))
    setSelectedVisitors((prev) => prev.filter((id) => validIds.has(String(id))))
  }, [visitors])

  const handleExport = () => {
    const csv = [
      ['Name', 'Phone', 'Email', 'First Visit', 'Subscribed', 'Tags', 'Last Contact'].join(','),
      ...filteredVisitors.map((visitor) => (
        [
          visitor.name,
          visitor.phone,
          visitor.email || '',
          visitor.firstVisit || '',
          visitor.subscribed ? 'Yes' : 'No',
          visitor.tags.join('; '),
          visitor.lastContact || ''
        ].map(escapeCsv).join(',')
      ))
    ].join('\n')

    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `visitors-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const runBulkSubscriptionUpdate = async (isSubscribed) => {
    if (!selectedVisitors.length) return
    const targets = visitors.filter((visitor) => selectedVisitors.includes(String(visitor.id)))
    if (!targets.length) return

    setIsSaving(true)
    setNotice(null)
    try {
      await Promise.all(
        targets.map((visitor) => updateVisitorSubscriptionStatus(visitor.phone, isSubscribed))
      )
      await refreshVisitors({ silent: true })
      setSelectedVisitors([])
      openModal({
        title: isSubscribed ? 'Success' : 'Action Completed',
        message: isSubscribed
          ? `${targets.length} visitor${targets.length > 1 ? 's have' : ' has'} been subscribed successfully.`
          : `${targets.length} visitor${targets.length > 1 ? 's have' : ' has'} been unsubscribed successfully.`,
        tone: isSubscribed ? 'success' : 'info',
        confirmLabel: 'Done'
      })
    } catch (error) {
      setNotice({ tone: 'error', text: error?.message || 'Unable to update visitor subscriptions right now.' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddVisitor = (ui) => {
    setVisitorForm(EMPTY_VISITOR_FORM)
    openModal({
      title: 'Add New Visitor',
      message: 'Enter visitor details to save them to the shared visitor list.',
      confirmLabel: 'Add Visitor',
      onConfirm: async () => {
        const name = visitorForm.name.trim()
        const phoneNumber = visitorForm.phone.trim()
        const email = visitorForm.email.trim()

        if (!name || !phoneNumber) {
          setNotice({ tone: 'error', text: 'Visitor name and phone number are required.' })
          return false
        }

        setIsSaving(true)
        setNotice(null)
        try {
          await createVisitorRecord({
            name,
            phoneNumber,
            email,
            firstVisitDate: new Date().toISOString().slice(0, 10),
            tags: ['new']
          })
          await refreshVisitors({ silent: true })
          setNotice({ tone: 'success', text: 'Visitor added successfully.' })
          return true
        } catch (error) {
          setNotice({ tone: 'error', text: error?.message || 'Unable to add visitor right now.' })
          return false
        } finally {
          setIsSaving(false)
        }
      },
      children: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: ui.textSecondary, marginBottom: '0.35rem' }}>Full Name</label>
            <input
              type="text"
              value={visitorForm.name}
              placeholder="John Doe"
              onChange={(event) => setVisitorForm((prev) => ({ ...prev, name: event.target.value }))}
              style={{ width: '100%', padding: '0.75rem', background: ui.panelSubtle, border: `1px solid ${ui.border}`, borderRadius: '0.5rem', color: ui.textPrimary, outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: ui.textSecondary, marginBottom: '0.35rem' }}>Phone Number</label>
            <input
              type="text"
              value={visitorForm.phone}
              placeholder="+234..."
              onChange={(event) => setVisitorForm((prev) => ({ ...prev, phone: event.target.value }))}
              style={{ width: '100%', padding: '0.75rem', background: ui.panelSubtle, border: `1px solid ${ui.border}`, borderRadius: '0.5rem', color: ui.textPrimary, outline: 'none' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 600, color: ui.textSecondary, marginBottom: '0.35rem' }}>Email Address</label>
            <input
              type="email"
              value={visitorForm.email}
              placeholder="visitor@example.com"
              onChange={(event) => setVisitorForm((prev) => ({ ...prev, email: event.target.value }))}
              style={{ width: '100%', padding: '0.75rem', background: ui.panelSubtle, border: `1px solid ${ui.border}`, borderRadius: '0.5rem', color: ui.textPrimary, outline: 'none' }}
            />
          </div>
        </div>
      )
    })
  }

  return { isLoading, isSaving, refreshVisitors, handleExport, runBulkSubscriptionUpdate, handleAddVisitor }
}
