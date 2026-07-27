import React, { useId } from 'react'

/**
 * SliderControl - Shared accessible range slider component.
 * Displays a labelled parameter, current value, and styled range input.
 *
 * Props:
 *   label     {string}   - parameter name (uppercase)
 *   value     {string|number} - current display value (pre-formatted)
 *   unit      {string}   - unit abbreviation
 *   min       {number}   - slider minimum
 *   max       {number}   - slider maximum
 *   step      {number?}  - slider step (defaults to (max-min)/100)
 *   onChange  {function} - callback receiving the new float value
 *   disabled  {bool?}    - if true, renders greyed out and non-interactive
 */
export default function SliderControl({ label, value, unit, min, max, step, onChange, disabled = false }) {
    const inputId = useId()
    const numericValue = typeof value === 'string' ? parseFloat(value) : value
    const displayValue = `${value}${unit ? ` ${unit}` : ''}`

    return (
        <div className={`flex flex-col gap-3 px-5 py-4 border bg-surface-container-lowest transition-all duration-200 ${
            disabled ? 'opacity-30 pointer-events-none grayscale' : 'border-white/[0.08] hover:border-white/20 hover:bg-surface-container-low'
        }`}>
            <div className="flex justify-between items-baseline gap-2">
                <label 
                    htmlFor={inputId}
                    className="text-[10.5px] font-semibold tracking-[0.2em] text-white/70 uppercase font-headline cursor-pointer"
                >
                    {label}
                </label>
                <span className="text-[12px] font-mono font-bold text-white uppercase tracking-[0.1em] whitespace-nowrap tabular-nums">
                    {displayValue}
                </span>
            </div>
            <input
                id={inputId}
                type="range"
                min={min}
                max={max}
                step={step ?? (max - min) / 100}
                value={numericValue}
                onChange={e => onChange(parseFloat(e.target.value))}
                disabled={disabled}
                aria-label={`${label}: ${displayValue}`}
                aria-valuemin={min}
                aria-valuemax={max}
                aria-valuenow={numericValue}
            />
        </div>
    )
}
