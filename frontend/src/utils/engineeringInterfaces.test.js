import test from 'node:test'
import assert from 'node:assert/strict'
import { createScenario, readPageScenario } from './scenario.js'
import { preparePreset } from './presetApplication.js'
import { resultExport, chartTraces } from './resultExport.js'
import { PAGE_DEFAULTS } from '../data/pageDefaults.js'
import { ENGINE_PRESETS, ROCKET_PRESETS, MISSION_PRESETS } from '../data/presets.js'

test('page scenarios migrate declared legacy fields and reject cross-page or unknown fields', () => {
  const template = { params: PAGE_DEFAULTS.rocket }
  const old = readPageScenario({ params: { pc: 1e7 } }, 'rocket', template)
  assert.equal(old.params.pc, 1e7)
  assert.equal(old.params.pa, 101325)
  const file = createScenario({ model: 'rocket', ...old })
  assert.deepEqual(readPageScenario(file, 'rocket', template), old)
  assert.throws(() => readPageScenario(file, 'generic_map', { params: PAGE_DEFAULTS.map }))
  assert.throws(() => readPageScenario({ params: { pc_bar: 10 } }, 'rocket', template))
  assert.throws(() => readPageScenario({ ...file, inputs: { model: 'rocket', params: { pc: 1e7 } } }, 'rocket', template))
  assert.throws(() => readPageScenario({ params: { pc: '10' } }, 'rocket', template))
})
test('preset application converts rocket bar to Pa and declares omitted geometry', () => {
  const result = preparePreset(ROCKET_PRESETS[0], 'rocket')
  assert.equal(result.params.pc, 9700000)
  assert.equal(result.params.pe, 101325)
  assert.equal(result.params.pa, 101325)
  assert.deepEqual(result.provenance.ignored_fields, ['area_ratio', 'throat_radius'])
  assert.equal(result.params.thrust_target_N, PAGE_DEFAULTS.rocket.thrust_target_N)
})
test('engine and mission presets apply supported fields from defaults only', () => {
  const fan = preparePreset(ENGINE_PRESETS[0], 'gas_turbine')
  assert.equal(fan.engine, 'turbofan')
  assert.equal(fan.params.prc, 32.8)
  assert.equal(fan.params.ab_enabled, false)
  assert.ok(fan.provenance.ignored_fields.includes('eta_f'))
  assert.equal(preparePreset(ENGINE_PRESETS[2], 'gas_turbine').engine, 'mixed_flow')
  assert.throws(() => preparePreset(ENGINE_PRESETS[4], 'gas_turbine'))
  assert.deepEqual(preparePreset(MISSION_PRESETS[0], 'mission').params, { k: .09, cd0: .018, cl_max: 2.1 })
})
test('chart policy preserves null gaps and does not mutate source data', () => {
  const rows = [{ y: [1, null, NaN, Infinity, 3], connectgaps: true }]
  assert.deepEqual(chartTraces(rows)[0].y, [1, null, null, null, 3])
  assert.equal(chartTraces(rows)[0].connectgaps, false)
  assert.equal(rows[0].connectgaps, true)
})
test('result metadata preserves assurance, unavailable metrics, and failed status', () => {
  const result = { status: 'NO_CONVERGENCE', tsfc: null, assurance: { inputs_si: { alt: 0 } } }
  const out = resultExport(result, 'test', '2026-09-09T00:00:00Z')
  assert.equal(out.tsfc, null)
  assert.deepEqual(out.assurance, result.assurance)
  assert.equal(out.export_metadata.schema_version, 1)
  assert.equal(out.status, 'NO_CONVERGENCE')
})
