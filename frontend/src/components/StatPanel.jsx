import React from 'react'

/**
 * StatPanel - Shared accessible metric display component.
 * Displays a labelled value with an optional unit and sub-label.
 *
 * Props:
 *   label   {string}  - metric name (uppercase)
 *   value   {string}  - formatted numeric value or placeholder "-"
 *   unit    {string?} - unit abbreviation (e.g. "kN", "s", "%")
 *   sub     {string?} - optional sub-label shown below value
 *   alert   {bool?}   - if true, renders in monochrome warning style
 */
export default function StatPanel({ label, value, unit, sub, alert = false }) {
    const fullTextLabel = `${label}: ${value}${unit ? ` ${unit}` : ''}${sub ? ` (${sub})` : ''}`

    return (
        <article 
            aria-label={fullTextLabel}
            className={`flex flex-col items-end group p-8 border bg-surface-container-low hover:bg-surface-container transition-all duration-200 ${
                alert ? 'border-white/30 bg-white/[0.05]' : 'border-white/[0.10] hover:border-white/25'
            }`}
        >
            <span className={`text-[10px] font-bold tracking-[0.25em] uppercase mb-4 font-headline transition-colors duration-200 ${
                alert ? 'warning-text' : 'text-white/60 group-hover:text-white/85'
            }`}>
                {label}
            </span>
            <div className="flex items-baseline gap-2">
                <span className="text-3xl font-black font-mono text-white tabular-nums">{value}</span>
                {unit && (
                    <span className="text-[11px] font-mono text-white/50 uppercase font-semibold tracking-[0.1em] group-hover:text-white/75 transition-colors duration-200">
                        {unit}
                    </span>
                )}
            </div>
            {sub && (
                <span className="text-[9.5px] font-mono text-white/45 uppercase tracking-[0.15em] mt-2">
                    {sub}
                </span>
            )}
        </article>
    )
}
