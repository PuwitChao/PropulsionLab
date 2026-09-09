import { PAGE_DEFAULTS } from '../data/pageDefaults.js'

export function preparePreset(preset, category) {
  let target, key, model, engine, params, ignored
  if (category === 'gas_turbine') {
    engine = { turbojet: 'turbojet', turbofan: 'turbofan', turbofan_afterburner: 'mixed_flow' }[preset.engineType]
    if (!engine) throw new Error('This preset has no compatible legacy page. Use the explicit methane research inputs.')
    target = 'on-design'; key = 'cycle_params'; model = 'legacy_cycle'
    params = { ...PAGE_DEFAULTS.cycle }
    ignored = Object.keys(preset.params).filter(k => !Object.hasOwn(params, k))
    for (const k of Object.keys(params)) if (Object.hasOwn(preset.params, k)) params[k] = preset.params[k]
  } else if (category === 'rocket') {
    target = 'rocket'; key = 'rocket_params'; model = 'rocket'
    params = { ...PAGE_DEFAULTS.rocket, pc: preset.params.pc_bar * 1e5, pe: preset.params.pe_bar * 1e5,
      of_ratio: preset.params.of_ratio, propellant: preset.params.propellant, mode: preset.params.mode }
    ignored = ['area_ratio', 'throat_radius']
  } else if (category === 'mission') {
    target = 'mission'; key = 'mission_aircraft_data'; model = 'mission_constraints'
    params = Object.fromEntries(Object.keys(PAGE_DEFAULTS.mission).map(k => [k, preset.params[k]]))
    ignored = Object.keys(preset.params).filter(k => !Object.hasOwn(params, k))
  } else throw new Error('Unsupported preset category.')
  return { target, key, model, engine, params, provenance: {
    kind: 'preset', label: preset.name, source: 'Bundled illustrative values; independent source not recorded',
    qualification: 'Unvalidated starting point; editable inputs may differ', ignored_fields: ignored,
  } }
}
