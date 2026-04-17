/**
 * StatPanel — Shared metric display component.
 * Displays a labelled value with an optional unit and sub-label.
 *
 * Props:
 *   label   {string}  — metric name (uppercase)
 *   value   {string}  — formatted numeric value or placeholder "—"
 *   unit    {string}  — unit abbreviation (e.g. "kN", "s", "%")
 *   sub     {string?} — optional sub-label shown below value
 *   alert   {bool?}   — if true, renders in alert (red-tinted) style
 */
export default function StatPanel({ label, value, unit, sub, alert = false }) {
    return (
        <div className={`flex flex-col items-end group p-12 border bg-surface-container-low hover:bg-surface-container transition-all ${alert ? 'border-red-500/20' : 'border-white/10'}`}>
            <span className={`text-[11px] font-black tracking-[0.2em] uppercase mb-5 font-headline transition-colors ${alert ? 'text-red-400' : 'text-white/40 group-hover:text-white'}`}>
                {label}
            </span>
            <div className="flex items-baseline gap-3">
                <span className="text-4xl font-black mono text-white">{value}</span>
                {unit && <span className="text-[12px] mono text-white/30 uppercase font-bold tracking-[0.1em]">{unit}</span>}
            </div>
            {sub && <span className="text-[10px] mono text-white/20 uppercase tracking-[0.1em] mt-2 italic">{sub}</span>}
        </div>
    )
}
