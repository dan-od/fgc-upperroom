import { createVisitor, getVisitorByPhone } from './src/services/visitor.repository.js'
import { getReminderQueue } from './src/queue/queues.js'

async function testPersonalization() {
  // Check and create test visitors
  let chioma = await getVisitorByPhone('+2348012345001')
  if (!chioma) {
    chioma = await createVisitor({
      name: 'Chioma Okafor',
      phoneNumber: '+2348012345001',
      timezone: 'Africa/Lagos'
    })
  }

  let tunde = await getVisitorByPhone('+2348012345002')
  if (!tunde) {
    tunde = await createVisitor({
      name: 'Tunde Adeyemi',
      phoneNumber: '+2348012345002',
      timezone: 'Africa/Lagos'
    })
  }

  // Queue service reminders
  const q = getReminderQueue()
  const jobData = {
    type: 'service',
    visitors: [
      { id: chioma.id, name: chioma.name, phone_number: chioma.phone_number },
      { id: tunde.id, name: tunde.name, phone_number: tunde.phone_number }
    ],
    context: { serviceTime: '08:00', isFirstSunday: false }
  }

  const job = await q.add('weekly-service-reminders', jobData)
  console.log('✅ Service reminders queued')
  console.log('Job ID:', job.id)
  console.log('  - Chioma Okafor (Female)')
  console.log('  - Tunde Adeyemi (Male)')
  process.exit(0)
}

testPersonalization().catch((err) => {
  console.error('Error:', err.message)
  process.exit(1)
})
