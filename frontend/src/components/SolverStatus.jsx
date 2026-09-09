import { APP_VERSION } from '../version'
import { resultExport } from '../utils/resultExport'
export default function SolverStatus({ result }) {
  if (!result?.assurance) return null
  const meta = result.assurance
  const failed = !['VALID', 'VALID_WITH_WARNING', 'OUTSIDE_VALIDATED_DOMAIN'].includes(meta.status)
  const exportResult = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(resultExport(result, APP_VERSION), null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'analysis_result.json'
    link.click()
    URL.revokeObjectURL(url)
  }
  return (
    <section aria-label="Solver assurance" role={failed ? 'alert' : 'status'} className="border border-white/20 p-4 mono text-sm">
      <strong>{meta.status}</strong>
      <p>Validation coverage is unknown. This result is not a validated design.</p>
      <p>Solver: {meta.solver?.name || result.model || 'Unspecified'} · Version: {meta.solver?.version || 'Unspecified'}</p>
      <p>Physical checks: {meta.physical_valid === true ? 'passed' : meta.physical_valid === false ? 'failed' : 'unknown'}.
        Validated domain: {meta.applicability?.within_validated_domain === true ? 'reported inside; inspect evidence' : meta.applicability?.within_validated_domain === false ? 'outside' : 'unknown'}.
        Uncertainty: {meta.uncertainty == null ? 'not established' : 'see evidence'}.</p>
      <details><summary>Inputs and model evidence</summary>
        <p>Input quantities use SI units unless a field declares a unit suffix.</p>
        <pre className="overflow-x-auto whitespace-pre-wrap">{JSON.stringify({ inputs_si: meta.inputs_si, assumptions: meta.assumptions,
          applicability: meta.applicability, validation: meta.validation, uncertainty: meta.uncertainty }, null, 2)}</pre>
      </details>
      {meta.warnings?.map((warning, index) => <p key={index}>{warning}</p>)}
      {meta.convergence && <p>
        {meta.convergence.termination_reason} · {meta.convergence.iterations} iterations
        {meta.convergence.residuals && ` · Residuals: ${JSON.stringify(meta.convergence.residuals)} ${meta.convergence.residual_units || ''}`}
      </p>}
      <button type="button" onClick={exportResult} className="border border-white/30 px-3 py-2 mt-2">Export result and assurance</button>
    </section>
  )
}
