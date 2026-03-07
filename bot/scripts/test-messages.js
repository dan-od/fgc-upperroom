#!/usr/bin/env node

/**
 * Test Message Generation
 * 
 * Generates sample messages to validate LLM prompts and templates
 */

import { generateServiceReminderMessage, generateEventReminderMessage } from '../src/services/message-generator.service.js'
import { logger } from '../src/lib/logger.js'

const testServiceMessages = async () => {
  console.log('\n📧 Testing Service Reminder Messages\n')
  console.log('='.repeat(60))

  const scenarios = [
    { name: 'John Doe', serviceTime: '07:30', isFirstSunday: true },
    { name: 'Jane Smith', serviceTime: '08:00', isFirstSunday: false },
    { name: undefined, serviceTime: '08:00', isFirstSunday: false }
  ]

  for (const scenario of scenarios) {
    try {
      const message = await generateServiceReminderMessage(scenario)
      console.log(`\nScenario: ${JSON.stringify(scenario)}`)
      console.log(`Message: ${message}`)
      console.log(`Length: ${message.length} chars`)
    } catch (error) {
      console.error(`Failed: ${error.message}`)
    }
  }
}

const testEventMessages = async () => {
  console.log('\n\n📅 Testing Event Reminder Messages\n')
  console.log('='.repeat(60))

  const scenarios = [
    { name: 'Alice', eventTitle: 'Youth Camp', eventDate: '2026-05-15' },
    { name: 'Bob', eventTitle: 'Easter Service', eventDate: '2026-04-20' },
    { name: undefined, eventTitle: 'Prayer Meeting', eventDate: '2026-03-10' }
  ]

  for (const scenario of scenarios) {
    try {
      const message = await generateEventReminderMessage(scenario)
      console.log(`\nScenario: ${JSON.stringify(scenario)}`)
      console.log(`Message: ${message}`)
      console.log(`Length: ${message.length} chars`)
    } catch (error) {
      console.error(`Failed: ${error.message}`)
    }
  }
}

const runTests = async () => {
  console.log('\n🧪 Message Generation Test Suite')
  await testServiceMessages()
  await testEventMessages()
  console.log('\n' + '='.repeat(60))
  console.log('\n✅ Test complete\n')
}

runTests().catch(error => {
  console.error('Test error:', error)
  process.exit(1)
})
