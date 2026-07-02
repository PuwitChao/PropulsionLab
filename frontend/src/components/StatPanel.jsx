/**
 * StatPanel - Shared metric display component.
 * Displays a labelled value with an optional unit and sub-label.
 *
 * Props:
 *   label   {string}  - metric name (uppercase)
 *   value   {string}  - formatted numeric value or placeholder "-"
 *   unit    {string}  - unit abbreviation (e.g. "kN", "s", "%")
 *   sub     {string?} - optional sub-label shown below value
 *   alert   {bool?}   - if true, renders in monochrome warning style
 */
export default function StatPanel({ label, value, unit, sub, alert = false }) {
    return (
        <div className={`flex flex-col items-end group p-8 border bg-surface-container-low hover:bg-surface-container transition-all duration-200 ${alert ? 'border-white/22 bg-white/[0.03]' : 'border-white/[0.07] hover:border-white/18'}`}>
            <span className={`text-[9px] font-bold tracking-[0.3em] uppercase mb-4 font-headline transition-colors duration-200 ${alert ? 'warning-text' : 'text-white/35 group-hover:text-white/65'}`}>
                {label}
            </span>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-white tabular-nums">{value}</span>
                {unit && <span className="text-[11px] font-mono text-white/25 uppercase font-semibold tracking-[0.1em] group-hover:text-white/45 transition-colors duration-200">{unit}</span>}
            </div>
            {sub && <span className="text-[9px] font-mono text-white/18 uppercase tracking-[0.15em] mt-2">{sub}</span>}
        </div>
    )
}
