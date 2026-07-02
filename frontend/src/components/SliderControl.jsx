/**
 * SliderControl - Shared range slider component.
 * Displays a label, current value, and a styled range input.
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
    return (
        <div className={`flex flex-col gap-3 px-5 py-4 border bg-surface-container-lowest transition-all duration-200 ${
            disabled ? 'opacity-20 pointer-events-none grayscale' : 'border-white/[0.06] hover:border-white/15 hover:bg-surface-container-low'
        }`}>
            <div className="flex justify-between items-baseline gap-2">
                <span className="text-[10px] font-semibold tracking-[0.2em] text-white/45 uppercase font-headline">{label}</span>
                <span className="text-[12px] font-mono font-bold text-white/85 uppercase tracking-[0.1em] whitespace-nowrap tabular-nums">
                    {value}{unit ? ` ${unit}` : ''}
                </span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step={step ?? (max - min) / 100}
                value={typeof value === 'string' ? parseFloat(value) : value}
                onChange={e => onChange(parseFloat(e.target.value))}
                disabled={disabled}
            />
        </div>
    )
}
