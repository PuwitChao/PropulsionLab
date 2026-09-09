import { APP_VERSION } from '../version'
import { resultExport } from '../utils/resultExport'
export default function SweepStatus({ rows }) {
  if (!rows) return null
  const failed = rows.filter(row => row.error || !['VALID', 'VALID_WITH_WARNING', 'OUTSIDE_VALIDATED_DOMAIN'].includes(row.status))
  const exportRows = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(rows.map(row => resultExport(row, APP_VERSION)), null, 2)], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'sweep_results.json'
    link.click()
    URL.revokeObjectURL(url)
  }
  return <section aria-label="Sweep assurance" className="border border-white/20 p-4">
    <p role="status">{rows.length} requested points; {failed.length} failed points. Validation coverage is unknown.</p>
    {failed.length > 0 && <details><summary>Failed point details</summary>
      <ul>{failed.map((row, index) => <li key={index}>
        {row.sweep_value ?? row.prc ?? row.of_ratio ?? row.altitude_m ?? row.throttle_pct}: {row.status} — {row.error_detail || row.assurance?.warnings?.join(' ')}
      </li>)}</ul>
    </details>}
    <button type="button" onClick={exportRows} className="border border-white/30 px-3 py-2">Export all point outcomes</button>
  </section>
}
