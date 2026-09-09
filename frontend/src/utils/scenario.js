/** Versioned input files. Result evidence remains a separate export. */
export function createScenario(inputs, createdAt = new Date().toISOString()) {
  return { schema: 'propulsion-analysis-scenario', schema_version: 1,
    model: inputs.model, units: 'SI', created_at: createdAt, inputs: { ...inputs } }
}

export function readScenario(document, model, legacyDefaults = {}) {
  if (!document || typeof document !== 'object' || Array.isArray(document)) {
    throw new Error('Select a scenario object.')
  }
  let inputs = document
  const versioned = Object.hasOwn(document, 'schema') || Object.hasOwn(document, 'schema_version')
  if (versioned) {
    if (document.schema !== 'propulsion-analysis-scenario' || document.schema_version !== 1) {
      throw new Error('Unsupported scenario schema or version.')
    }
    if (document.units !== 'SI') throw new Error('Scenario inputs must declare SI units.')
    if (document.model !== model) throw new Error('Check the selected research architecture.')
    inputs = document.inputs
  }
  if (!inputs || typeof inputs !== 'object' || Array.isArray(inputs) || inputs.model !== model) {
    throw new Error('Legacy cycle files are not compatible. Check the selected research architecture.')
  }
  // Only unversioned files receive the documented older dry-engine defaults.
  return versioned ? { ...inputs } : { ...legacyDefaults, ...inputs }
}


export function validatePageInputs(value, template, partial = false, path = 'inputs') {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`${path} must be an object.`)
  if (!partial && Object.keys(value).length !== Object.keys(template).length) throw new Error(`${path} must contain all required fields.`)
  for (const [key, item] of Object.entries(value)) {
    if (!Object.hasOwn(template, key)) throw new Error(`Unsupported scenario field: ${path}.${key}`)
    const expected = template[key]
    if (expected && typeof expected === 'object') validatePageInputs(item, expected, partial, `${path}.${key}`)
    else if (typeof item !== typeof expected || (typeof item === 'number' && !Number.isFinite(item))) {
      throw new Error(`Invalid scenario value: ${path}.${key}`)
    }
  }
  return value
}

export function readPageScenario(document, model, template) {
  const versioned = document && (Object.hasOwn(document, 'schema') || Object.hasOwn(document, 'schema_version'))
  let inputs
  if (versioned) {
    const decoded = readScenario(document, model)
    const { model: ignored, ...payload } = decoded
    if (ignored !== model) throw new Error('Scenario model mismatch.')
    inputs = payload
  } else inputs = document
  validatePageInputs(inputs, template, !versioned)
  // Legacy migration fills absent fields from the declared page defaults.
  const merge = (base, changes) => Object.fromEntries(Object.entries(base).map(([key, value]) => [key,
    value && typeof value === 'object' ? merge(value, changes[key] || {}) : changes[key] ?? value]))
  return merge(template, inputs)
}
