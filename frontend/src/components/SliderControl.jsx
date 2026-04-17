/**
 * SliderControl — Shared range slider component.
 * Displays a label, current value, and a styled range input.
 *
 * Props:
 *   label     {string}   — parameter name (uppercase)
 *   value     {string|number} — current display value (pre-formatted)
 *   unit      {string}   — unit abbreviation
 *   min       {number}   — slider minimum
 *   max       {number}   — slider maximum
 *   step      {number?}  — slider step (defaults to (max-min)/100)
 *   onChange  {function} — callback receiving the new float value
 *   disabled  {bool?}    — if true, renders greyed out and non-interactive
 */
export default function SliderControl({ label, value, unit, min, max, step, onChange, disabled = false }) {
    return (
        <div className={`flex flex-col gap-6 p-8 border border-white/10 bg-surface-container-low transition-all ${
            disabled ? 'opacity-20 pointer-events-none grayscale' : 'hover:border-white/20'
        }`}>
            <div className="flex justify-between items-baseline">
                <span className="text-[11px] font-black tracking-[0.2em] text-white/40 uppercase">{label}</span>
                <span className="text-[12px] font-mono font-bold text-white uppercase tracking-widest">
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
