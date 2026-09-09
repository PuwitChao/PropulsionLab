import test from 'node:test'
import assert from 'node:assert/strict'
import { createScenario, readScenario } from './scenario.js'

const inputs = { model: 'methane_turbojet_research', mach: 0 }
test('versioned scenario preserves SI inputs and source identity', () => {
  const file = createScenario(inputs, '2026-09-09T00:00:00Z')
  assert.equal(file.units, 'SI')
  assert.equal(file.schema_version, 1)
  assert.deepEqual(readScenario(JSON.parse(JSON.stringify(file)), inputs.model), inputs)
  file.inputs.mach = 2
  assert.equal(inputs.mach, 0)
})
test('only unversioned inputs receive older dry-engine defaults', () => {
  const defaults = { afterburner_temperature_k: null }
  assert.equal(readScenario(inputs, inputs.model, defaults).afterburner_temperature_k, null)
  assert.equal(Object.hasOwn(readScenario(createScenario(inputs), inputs.model, defaults), 'afterburner_temperature_k'), false)
})
test('unknown schema, units, architecture, and malformed payloads are rejected', () => {
  const file = createScenario(inputs)
  for (const bad of [null, [], { ...file, schema_version: 2 }, { ...file, units: 'imperial' },
    { ...file, schema: 'other' }, { ...file, model: 'other' }, { ...file, inputs: [] },
    { ...file, inputs: { model: 'other' } }, { params: inputs }]) {
    assert.throws(() => readScenario(bad, inputs.model))
  }
})
