import test from 'node:test'
import assert from 'node:assert/strict'

import { renderTemplateContent } from '../../src/services/template.repository.js'

test('renderTemplateContent replaces known placeholders and trims whitespace', () => {
  const template = 'Hi {{name}}, {{eventTitle}} is coming up on {{eventDate}}. {{eventTimeLine}} {{registrationLine}} We look forward to seeing you.'
  const rendered = renderTemplateContent(template, {
    name: 'Ada',
    eventTitle: 'Youth Summit',
    eventDate: 'June 2, 2026',
    eventTimeLine: 'Time: 09:30.',
    registrationLine: 'Register here: https://example.com/register'
  })

  assert.equal(
    rendered,
    'Hi Ada, Youth Summit is coming up on June 2, 2026. Time: 09:30. Register here: https://example.com/register We look forward to seeing you.'
  )
})

test('renderTemplateContent removes unknown placeholders gracefully', () => {
  const template = 'Hello {{name}} {{unknownToken}}'
  const rendered = renderTemplateContent(template, { name: 'Member' })
  assert.equal(rendered, 'Hello Member')
})
