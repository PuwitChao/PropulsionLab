export function resultExport(result, appVersion, exportedAt = new Date().toISOString()) {
  return { ...result, export_metadata: { schema: 'propulsion-analysis-result', schema_version: 1,
    app_version: appVersion, exported_at: exportedAt, numerical_units: 'SI unless an output key declares a unit suffix',
    validation_claim: 'No independent model validation is established by this export' } }
}

export function chartTraces(traces = []) {
  return traces.map(trace => {
    const next = { ...trace, connectgaps: false }
    for (const axis of ['x', 'y', 'z']) {
      if (Array.isArray(trace[axis])) next[axis] = trace[axis].map(value => typeof value === 'number' && !Number.isFinite(value) ? null : value)
    }
    return next
  })
}
