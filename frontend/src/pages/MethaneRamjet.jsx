import { useRef, useState } from 'react'
import { fetchData } from '../api'
import { createScenario, readScenario } from '../utils/scenario'
import SolverStatus from '../components/SolverStatus'
import usePersistentState from '../hooks/usePersistentState'

const afterburnerDefaults = { afterburner_temperature_k: null, afterburner_pressure_loss: .03, afterburner_heat_loss_j_per_kg_inlet_gas: 0 }
const ramjetDefaults = { model: 'methane_ramjet_research', alt: 0, mach: 3,
  burner_temperature_k: 2200, inlet_pressure_recovery: .8, burner_pressure_loss: .06,
  nozzle_pressure_loss: .02, fuel_temperature_k: 300, heat_loss_j_per_kg_air: 0 }
const ramjetFields = [
  ['alt', 'Geometric altitude (m)', 0, 47000, 100],
  ['mach', 'Flight Mach', 1, 5, .1],
  ['burner_temperature_k', 'Burner temperature (K)', 300, 3500, 10],
  ['inlet_pressure_recovery', 'Inlet pressure recovery', .01, 1, .01],
  ['burner_pressure_loss', 'Burner pressure loss fraction', 0, .99, .01],
  ['nozzle_pressure_loss', 'Nozzle pressure loss fraction', 0, .99, .01],
  ['fuel_temperature_k', 'Methane inlet temperature (K)', 300, 1500, 10],
  ['heat_loss_j_per_kg_air', 'Heat loss (J/kg inlet air)', 0, undefined, 1000],
]
function validScenario(data, defaults, fields) {
  return data?.model === defaults.model && Object.keys(data).length === Object.keys(defaults).length &&
    fields.every(([key, , min, max]) => (key === 'afterburner_temperature_k' && data[key] === null) || typeof data[key] === 'number' && Number.isFinite(data[key]) &&
      data[key] >= min && (max === undefined || data[key] <= max))
}
const fmt = value => value == null ? 'Unavailable' : value.toFixed(3)

export default function MethaneRamjet({ engine = 'ramjet' }) {
  const isTurbojet = engine !== 'ramjet'
  const isFan = ['turbofan', 'mixed_turbofan', 'multispool'].includes(engine)
  const canReheat = engine === 'turbojet' || engine === 'mixed_turbofan'
  let defaults = isTurbojet ? { ...ramjetDefaults, ...afterburnerDefaults, model: 'methane_turbojet_research', mach: 0,
    burner_temperature_k: 1800, inlet_pressure_recovery: .98, compressor_pressure_ratio: 10,
    compressor_isentropic_efficiency: .88, turbine_isentropic_efficiency: .9, shaft_mechanical_efficiency: .98 } : ramjetDefaults
  let fields = isTurbojet ? [...ramjetFields.map(field => field[0] === 'mach' ? ['mach', 'Flight Mach', 0, 5, .1] : field),
    ['compressor_pressure_ratio', 'Compressor pressure ratio', 1, 60, .1],
    ['compressor_isentropic_efficiency', 'Compressor isentropic efficiency', .01, 1, .01],
    ['turbine_isentropic_efficiency', 'Turbine isentropic efficiency', .01, 1, .01],
    ['shaft_mechanical_efficiency', 'Shaft mechanical efficiency', .01, 1, .01],
    ['afterburner_temperature_k', 'Afterburner temperature (K)', 300, 3500, 10],
    ['afterburner_pressure_loss', 'Afterburner pressure loss fraction', 0, .99, .01],
    ['afterburner_heat_loss_j_per_kg_inlet_gas', 'Afterburner heat loss (J/kg inlet gas)', 0, undefined, 1000]] : ramjetFields
  if (isFan) {
    defaults = { ...defaults, model: `methane_${engine}_research`, compressor_pressure_ratio: 8,
      bypass_ratio: 2, fan_pressure_ratio: 1.5, booster_pressure_ratio: 2, mixer_pressure_loss: .03 }
    fields = [...fields, ['bypass_ratio', 'Bypass/core air mass ratio', 0, 15, .1],
      ['fan_pressure_ratio', 'Fan pressure ratio', 1, 5, .1],
      ['booster_pressure_ratio', 'Booster pressure ratio', 1, 6, .1],
      ['mixer_pressure_loss', 'Mixer pressure loss fraction', 0, .99, .01]]
  }
  const [storedParams, setParams] = usePersistentState(`methane_${engine}_research_params`, defaults)
  const params = isTurbojet ? { ...afterburnerDefaults, ...storedParams } : storedParams
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const sequence = useRef(0)
  function change(key, value) {
    sequence.current += 1
    setLoading(false)
    setResult(null)
    setParams(previous => ({ ...previous, [key]: value }))
  }
  async function solve(event) {
    event.preventDefault()
    const request = ++sequence.current
    setResult(null)
    setError(null)
    if (!validScenario(params, defaults, fields)) { setError('Check the research model inputs.'); return }
    setLoading(true)
    try {
      const data = await fetchData(`/analyze/cycle/methane-${isFan ? 'turbofan' : engine}`, { method: 'POST', body: JSON.stringify(params) })
      if (request === sequence.current) setResult(data)
    } catch (e) {
      if (request === sequence.current) setError(`${e.solverStatus || 'SOLVER_ERROR'}: ${e.message}`)
    } finally { if (request === sequence.current) setLoading(false) }
  }
  function exportScenario() {
    if (!validScenario(params, defaults, fields)) { setError('Check the research model inputs before export.'); return }
    const url = URL.createObjectURL(new Blob([JSON.stringify(createScenario(params), null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `methane_${engine}_scenario.json`
    link.click()
    URL.revokeObjectURL(url)
  }
  async function importScenario(event) {
    const file = event.target.files?.[0]
    if (!file) return
    const request = ++sequence.current
    setLoading(false)
    setResult(null)
    try {
      const parsed = JSON.parse(await file.text())
      const data = readScenario(parsed, defaults.model, isTurbojet ? afterburnerDefaults : {})
      if (request !== sequence.current) return
      if (!validScenario(data, defaults, fields)) throw new Error('Select a methane research scenario with all required inputs. Legacy cycle files are not compatible. Check the selected research architecture.')
      setParams(data)
      setError(null)
    } catch (e) { if (request === sequence.current) setError(e.message) }
    event.target.value = ''
  }
  const rows = result ? [
    ['Inlet total', result.inlet.total], ...(result.compressor ? [['Compressor outlet', result.compressor.outlet]] : []),
    ['Burner products', result.burner.products], ...(result.shaft ? [['Turbine outlet', result.shaft.stage.outlet]] : []), ...(result.afterburner ? [['Afterburner products', result.afterburner.products]] : []),
    ...(result.nozzle ? [['Nozzle static exit', result.nozzle.exit]] : Object.entries(result.nozzles).map(([name, n]) => [`${name} static exit`, n.flow.exit])),
  ] : []
  return <section className="space-y-6" aria-label={`Methane research ${engine}`}>
    <h2>Methane research {engine}</h2>
    <p>Pure CH4 fuel, equilibrium combustion, and frozen convergent nozzle. This model is unvalidated. It does not represent Jet-A.</p>
    <p>Efficiencies are unavailable pending review of the pressure-energy definition. All inputs and outputs use SI units.</p>
    {canReheat && <label className="flex gap-3"><input type="checkbox" checked={params.afterburner_temperature_k !== null}
      onChange={e => change('afterburner_temperature_k', e.target.checked ? 2200 : null)} />Enable methane afterburner</label>}
    <form onSubmit={solve} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {fields.map(([key, label, min, max, step]) => <label key={key} className="flex flex-col gap-2">
        {label}<input type="number" required disabled={(key.startsWith('afterburner_') && (!canReheat || params.afterburner_temperature_k === null)) || (key === 'mixer_pressure_loss' && engine !== 'mixed_turbofan')} min={min} max={max} step={step} value={params[key] ?? ''}
          onChange={e => change(key, e.target.value === '' ? '' : Number(e.target.value))} className="bg-surface-container-low border p-3" />
      </label>)}
      <button type="submit" disabled={loading} className="border p-3">{loading ? `Computing methane ${engine}…` : `Solve methane ${engine}`}</button>
      <button type="button" onClick={exportScenario} className="border p-3">Export methane scenario</button>
      <label>Import methane scenario<input type="file" accept=".json" onChange={importScenario} /></label>
    </form>
    {error && <p role="alert">{error}</p>}
    <SolverStatus result={result} />
    {result && <div className="space-y-4" aria-label="Methane result">
      <p>Model: {result.model} · Fuel: {result.fuel}</p>
      <p>Specific thrust: {fmt(result.spec_thrust)} N per kg/s inlet air</p>
      <p>TSFC: {fmt(result.tsfc == null ? null : result.tsfc * 1e6)} mg/(N·s)</p>
      {result.afterburner && <>
        <p>Added afterburner fuel/core-air ratio: {result.f_afterburner.toFixed(6)}</p>
        <p>Afterburner energy residual: {fmt(result.afterburner.energy_residual_j_per_kg_inlet_gas)} J/kg inlet gas</p>
      </>}
      <p>Fuel/air mass ratio: {result.f_total.toFixed(6)}</p>
      <p>Thermal efficiency: Unavailable · Propulsive efficiency: Unavailable</p>
      {result.shafts && Object.entries(result.shafts).map(([name, shaft]) => <p key={name}>{name.toUpperCase()} shaft work residual: {fmt(shaft.residual_j_per_kg_core_air)} J/kg core air</p>)}
      {result.shaft && <p>Shaft work residual: {fmt(result.shaft.residual_j_per_kg_core_air)} J/kg core air</p>}
      <p>Burner energy residual: {fmt(result.burner.energy_residual_j_per_kg_air)} J/kg inlet air</p>
      <table className="w-full text-left"><thead><tr><th className="p-3">State</th><th className="p-3">Temperature (K)</th><th className="p-3">Pressure (Pa)</th></tr></thead>
        <tbody>{rows.map(([name, state]) => <tr key={name}><td className="p-3">{name}</td><td className="p-3">{fmt(state.temperature_k)}</td><td className="p-3">{fmt(state.pressure_pa)}</td></tr>)}</tbody>
      </table>
    </div>}
  </section>
}
