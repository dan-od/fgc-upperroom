import test from 'node:test'
import assert from 'node:assert/strict'

import { renderTemplateContent } from '../../src/services/template.repository.js'

test('renderTemplateContent replaces known placeholders and trims whitespace', () => {
  const template = 'Hi {{name}}, {{eventTitle}} is on {{eventDate}}. {{registrationLine}}'
  const rendered = renderTemplateContent(template, {
    name: 'Ada',
    eventTitle: 'Youth Summit',
    eventDate: 'June 2, 2026',
    registrationLine: 'Register here: https://example.com/register'
  })

  assert.equal(
    rendered,
    'Hi Ada, Youth Summit is on June 2, 2026. Register here: https://example.com/register'
  )
})

test('renderTemplateContent removes unknown placeholders gracefully', () => {
  const template = 'Hello {{name}} {{unknownToken}}'
  const rendered = renderTemplateContent(template, { name: 'Member' })
  assert.equal(rendered, 'Hello Member')
})
